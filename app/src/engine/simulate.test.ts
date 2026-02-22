import { describe, it, expect } from 'vitest'
import { simulate } from './simulate'
import { DEFAULT_COUPLE_INPUTS, DEFAULT_INPUTS, type Inputs } from '@/types'

function makeInputs(overrides: Partial<Inputs> = {}): Inputs {
  return { ...DEFAULT_INPUTS, ...overrides }
}

describe('simulate', () => {
  describe('basic mechanics', () => {
    it('produces correct number of monthly snapshots', () => {
      const result = simulate(makeInputs({ currentAge: 40, longevity: 100 }))
      expect(result.months).toHaveLength(720) // 60 years × 12
    })

    it('age progresses correctly', () => {
      const result = simulate(makeInputs({ currentAge: 40, longevity: 43 }))
      expect(result.months[0].age).toBe(40)
      expect(result.months[1].age).toBeCloseTo(40 + 1 / 12)
      expect(result.months[11].age).toBeCloseTo(40 + 11 / 12)
      expect(result.months[12].age).toBeCloseTo(41)
    })

    it('marks retirement transition correctly', () => {
      const result = simulate(
        makeInputs({ currentAge: 58, retirementAge: 60, longevity: 62 }),
      )
      const retirementMonth = 24 // (60 - 58) * 12
      expect(result.months[retirementMonth - 1].isRetired).toBe(false)
      expect(result.months[retirementMonth].isRetired).toBe(true)
    })

    it('cumulative inflation advances each month', () => {
      const result = simulate(
        makeInputs({ currentAge: 40, longevity: 41, inflationPct: 2 }),
      )
      // After 12 months at 2%, cumInfl ≈ 1.02
      expect(result.months[0].cumulativeInflation).toBeGreaterThan(1.0)
      expect(result.months[11].cumulativeInflation).toBeCloseTo(1.02, 2)
    })

    it('investment growth applies each month', () => {
      const result = simulate(
        makeInputs({
          currentAge: 59,
          retirementAge: 60,
          longevity: 61,
          equityGrowthPct: 6,
          bondRatePct: 4,
          cashRatePct: 4,
        }),
      )
      // Each month should have positive growth
      for (const month of result.months.slice(0, 12)) {
        expect(month.investmentGrowth).toBeGreaterThan(0)
      }
    })
  })

  describe('pre-retirement', () => {
    it('contributions flow to correct accounts', () => {
      const inputs = makeInputs({
        currentAge: 59,
        retirementAge: 60,
        longevity: 61,
        sippBalance: 100_000,
        ssISABalance: 30_000,
        cashISABalance: 5_000,
        cashSavingsBalance: 10_000,
        employeePensionPct: 10,
        employerPensionPct: 5,
        monthlyISA: 500,
        ssISASplitPct: 80,
      })
      const result = simulate(inputs)

      // After first month, all investment accounts should be above initial
      // (contributions + growth)
      const m = result.months[0].balancesNominal
      expect(m.sipp.equities + m.sipp.bonds).toBeGreaterThan(100_000)
      expect(m.ssISA.equities + m.ssISA.bonds).toBeGreaterThan(30_000)
      expect(m.cashISA).toBeGreaterThan(5_000)

      // Contributions are recorded
      expect(result.months[0].contributions).toBeGreaterThan(0)
    })

    it('salary grows annually', () => {
      const result = simulate(
        makeInputs({
          currentAge: 38,
          retirementAge: 60,
          longevity: 61,
          salary: 65_000,
          salaryGrowthPct: 3,
        }),
      )
      // Year 0: salary = 65000
      expect(result.months[0].salary).toBe(65_000)
      // Year 1: salary = 65000 * 1.03
      expect(result.months[12].salary).toBeCloseTo(65_000 * 1.03)
      // Year 2: salary = 65000 * 1.03^2
      expect(result.months[24].salary).toBeCloseTo(65_000 * 1.03 ** 2)
    })

    it('no spending or drawdowns pre-retirement', () => {
      const result = simulate(
        makeInputs({ currentAge: 58, retirementAge: 60, longevity: 61 }),
      )
      for (const month of result.months.filter((m) => !m.isRetired)) {
        expect(month.spending).toBe(0)
        expect(month.taxPaid).toBe(0)
        expect(month.statePensionIncome).toBe(0)
      }
    })
  })

  describe('retirement transition', () => {
    it('last contribution before retirement, first drawdown at retirement', () => {
      const result = simulate(
        makeInputs({ currentAge: 59, retirementAge: 60, longevity: 62 }),
      )
      const retirementMonth = 12

      // Month before retirement: contributions, no spending
      expect(result.months[retirementMonth - 1].contributions).toBeGreaterThan(0)
      expect(result.months[retirementMonth - 1].spending).toBe(0)

      // Retirement month: no contributions, has spending
      expect(result.months[retirementMonth].contributions).toBe(0)
      expect(result.months[retirementMonth].spending).toBeGreaterThan(0)
    })

    it('summary reports total at retirement in real terms', () => {
      const result = simulate(
        makeInputs({
          currentAge: 58,
          retirementAge: 60,
          longevity: 62,
          inflationPct: 2,
        }),
      )
      const retirementMonthIndex = 24
      // totalAtRetirement should match the last pre-retirement snapshot's totalReal
      expect(result.summary.totalAtRetirement).toBeCloseTo(
        result.months[retirementMonthIndex - 1].totalReal,
      )
    })

    it('uses years-to-retirement offsets for couple retirement snapshot', () => {
      const inputs: Inputs = {
        ...DEFAULT_COUPLE_INPUTS,
        partnerA: {
          ...DEFAULT_COUPLE_INPUTS.partnerA,
          currentAge: 40,
          retirementAge: 65,
        },
        partnerB: {
          ...DEFAULT_COUPLE_INPUTS.partnerB,
          currentAge: 35,
          retirementAge: 60,
        },
        longevity: 90,
      }

      const result = simulate(inputs)
      const retirementMonthIndex = 300 // min((65-40), (60-35)) * 12

      expect(result.summary.totalAtRetirement).toBeCloseTo(
        result.months[retirementMonthIndex - 1].totalReal,
      )
    })

    it('handles already-retired scenario', () => {
      const inputs = makeInputs({
        currentAge: 65,
        retirementAge: 60,
        longevity: 67,
      })
      const result = simulate(inputs)

      // All months should be retired
      expect(result.months.every((m) => m.isRetired)).toBe(true)
      // No contributions
      expect(result.months.every((m) => m.contributions === 0)).toBe(true)
      // totalAtRetirement is the initial pot
      const initialTotal =
        inputs.sippBalance + inputs.ssISABalance + inputs.cashISABalance + inputs.cashSavingsBalance
      expect(result.summary.totalAtRetirement).toBe(initialTotal)
    })
  })

  describe('post-retirement', () => {
    it('spending reduces account balances', () => {
      const inputs = makeInputs({
        currentAge: 65,
        retirementAge: 60,
        longevity: 67,
        annualSpending: 30_000,
        // Zero growth to isolate spending effect
        equityGrowthPct: 0,
        bondRatePct: 0,
        cashRatePct: 0,
        inflationPct: 0,
      })
      const result = simulate(inputs)

      // Total should decrease each month due to spending
      for (let i = 1; i < result.months.length; i++) {
        expect(result.months[i].totalNominal).toBeLessThan(result.months[i - 1].totalNominal)
      }
    })

    it('state pension reduces drawdown need', () => {
      // Two simulations: with and without state pension
      const withSP = simulate(
        makeInputs({
          currentAge: 68,
          retirementAge: 60,
          longevity: 70,
          statePensionAge: 68,
          statePensionAmount: 11_500,
          annualSpending: 30_000,
          equityGrowthPct: 0,
          bondRatePct: 0,
          cashRatePct: 0,
          inflationPct: 0,
        }),
      )

      const withoutSP = simulate(
        makeInputs({
          currentAge: 68,
          retirementAge: 60,
          longevity: 70,
          statePensionAge: 90, // effectively no state pension
          statePensionAmount: 11_500,
          annualSpending: 30_000,
          equityGrowthPct: 0,
          bondRatePct: 0,
          cashRatePct: 0,
          inflationPct: 0,
        }),
      )

      // With state pension, balances should be higher (less drawn down)
      expect(withSP.months[12].totalNominal).toBeGreaterThan(withoutSP.months[12].totalNominal)
      // State pension income should be recorded
      expect(withSP.months[0].statePensionIncome).toBeGreaterThan(0)
      expect(withoutSP.months[0].statePensionIncome).toBe(0)
    })

    it('reports age money runs out for shortfall scenario', () => {
      const result = simulate(
        makeInputs({
          currentAge: 65,
          retirementAge: 65, // already retired
          longevity: 100,
          sippBalance: 10_000,
          ssISABalance: 5_000,
          cashISABalance: 2_000,
          cashSavingsBalance: 3_000,
          annualSpending: 30_000,
          equityGrowthPct: 0,
          bondRatePct: 0,
          cashRatePct: 0,
          inflationPct: 0,
          statePensionAge: 90, // no state pension help
        }),
      )

      // With £20k total and £30k/year spending, money runs out within ~1 year
      expect(result.summary.ageMoneyRunsOut).not.toBeNull()
      expect(result.summary.ageMoneyRunsOut!).toBeLessThan(67)
      expect(result.summary.yearsFunded).toBeLessThan(2)
    })

    it('reports null ageMoneyRunsOut when money lasts', () => {
      const result = simulate(
        makeInputs({
          currentAge: 65,
          retirementAge: 60,
          longevity: 70,
          sippBalance: 500_000,
          annualSpending: 20_000,
        }),
      )
      expect(result.summary.ageMoneyRunsOut).toBeNull()
      expect(result.summary.yearsFunded).toBe(10) // 70 - 60
    })
  })

  describe('SIPP marginal rate estimation', () => {
    it('uses 0% rate when no fixed income (no state pension)', () => {
      const result = simulate(
        makeInputs({
          currentAge: 60,
          retirementAge: 60,
          longevity: 62,
          statePensionAge: 68, // not yet active
          drawdownOrder: ['SIPP', 'ISA', 'Cash'],
        }),
      )
      // With 0% marginal rate, no tax on SIPP drawdowns
      for (const month of result.months.slice(0, 12)) {
        expect(month.taxPaid).toBe(0)
      }
    })

    it('uses basic rate when state pension exceeds personal allowance', () => {
      const result = simulate(
        makeInputs({
          currentAge: 68,
          retirementAge: 60,
          longevity: 70,
          statePensionAge: 68,
          statePensionAmount: 15_000, // above £12,570 PA
          drawdownOrder: ['SIPP', 'ISA', 'Cash'],
          annualSpending: 30_000,
        }),
      )
      // SIPP drawdowns should incur tax (basic rate on 75% of withdrawal)
      const monthWithSIPPDraw = result.months.find((m) => m.taxPaid > 0)
      expect(monthWithSIPPDraw).toBeDefined()
    })

    it('re-estimates marginal rate at year boundaries', () => {
      // Retire at 60, state pension at 62
      // Year 0-1: no state pension → 0% marginal rate
      // Year 2+: state pension → rate depends on amount
      const result = simulate(
        makeInputs({
          currentAge: 60,
          retirementAge: 60,
          longevity: 64,
          statePensionAge: 62,
          statePensionAmount: 15_000, // above PA
          drawdownOrder: ['SIPP', 'ISA', 'Cash'],
          annualSpending: 30_000,
        }),
      )

      // Before state pension (months 0-23): 0% marginal rate → no tax
      for (const month of result.months.slice(0, 24)) {
        expect(month.taxPaid).toBe(0)
      }

      // After state pension starts and rate is re-estimated (month 24+):
      // State pension at 62 → re-estimated at year boundary (month 24)
      // Should have tax on SIPP drawdowns now
      const postSPMonths = result.months.slice(24)
      const monthWithTax = postSPMonths.find((m) => m.taxPaid > 0)
      expect(monthWithTax).toBeDefined()
    })
  })

  describe('contribution limit validation', () => {
    it('warns when ISA contributions exceed £20k annual limit', () => {
      const result = simulate(
        makeInputs({
          currentAge: 38,
          retirementAge: 60,
          longevity: 61,
          monthlyISA: 2_000, // £24k/year > £20k limit
        }),
      )
      const isaWarnings = result.warnings.filter((w) => w.type === 'isa_limit')
      expect(isaWarnings.length).toBeGreaterThan(0)
    })

    it('warns when SIPP contributions exceed £60k annual limit', () => {
      const result = simulate(
        makeInputs({
          currentAge: 38,
          retirementAge: 60,
          longevity: 61,
          salary: 500_000,
          employeePensionPct: 10,
          employerPensionPct: 10,
          // 20% of £500k = £100k/year > £60k limit
        }),
      )
      const sippWarnings = result.warnings.filter((w) => w.type === 'sipp_limit')
      expect(sippWarnings.length).toBeGreaterThan(0)
    })

    it('no warnings when contributions are within limits', () => {
      const result = simulate(
        makeInputs({
          currentAge: 38,
          retirementAge: 60,
          longevity: 61,
          monthlyISA: 500, // £6k/year < £20k
          salary: 65_000,
          employeePensionPct: 10,
          employerPensionPct: 5,
          // 15% of £65k = £9.75k/year < £60k
        }),
      )
      expect(result.warnings).toHaveLength(0)
    })
  })

  describe('one-off expenses', () => {
    it('pre-retirement: subtracts from cash savings', () => {
      const inputs = makeInputs({
        currentAge: 40,
        retirementAge: 60,
        longevity: 61,
        cashSavingsBalance: 20_000,
        oneOffExpenses: [{ year: 2027, amount: 10_000 }],
        // Zero rates to isolate the expense effect
        equityGrowthPct: 0,
        bondRatePct: 0,
        cashRatePct: 0,
        inflationPct: 0,
      })

      const withExpense = simulate(inputs)
      const withoutExpense = simulate(
        makeInputs({
          ...inputs,
          oneOffExpenses: [],
        }),
      )

      // In year 2027 (months 12-23), cash savings should be lower with the expense
      expect(withExpense.months[12].balancesNominal.cashSavings).toBeLessThan(
        withoutExpense.months[12].balancesNominal.cashSavings,
      )
    })

    it('pre-retirement: capped at zero (unfunded portion lost)', () => {
      const result = simulate(
        makeInputs({
          currentAge: 40,
          retirementAge: 60,
          longevity: 61,
          cashSavingsBalance: 5_000,
          cashISABalance: 0,
          ssISABalance: 0,
          oneOffExpenses: [{ year: 2026, amount: 50_000 }],
          equityGrowthPct: 0,
          bondRatePct: 0,
          cashRatePct: 0,
          inflationPct: 0,
        }),
      )

      // All accounts should not go negative
      for (const month of result.months) {
        expect(month.balancesNominal.cashSavings).toBeGreaterThanOrEqual(0)
        expect(month.balancesNominal.cashISA).toBeGreaterThanOrEqual(0)
        expect(month.balancesNominal.ssISA.equities).toBeGreaterThanOrEqual(0)
        expect(month.balancesNominal.ssISA.bonds).toBeGreaterThanOrEqual(0)
      }
    })

    it('warns when pre-retirement expense exceeds cash + ISAs', () => {
      const result = simulate(
        makeInputs({
          currentAge: 40,
          retirementAge: 60,
          longevity: 61,
          cashSavingsBalance: 5_000,
          cashISABalance: 3_000,
          ssISABalance: 2_000,
          oneOffExpenses: [{ year: 2026, amount: 50_000 }],
          equityGrowthPct: 0,
          bondRatePct: 0,
          cashRatePct: 0,
          inflationPct: 0,
          monthlyISA: 0,
          employeePensionPct: 0,
          employerPensionPct: 0,
        }),
      )

      const expenseWarnings = result.warnings.filter(w => w.type === 'expense_exceeds_cash')
      expect(expenseWarnings).toHaveLength(1)
      expect(expenseWarnings[0].year).toBe(2026)
      expect(expenseWarnings[0].message).toContain('50,000') // expense amount
      expect(expenseWarnings[0].message).toContain('10,000') // total available
      expect(expenseWarnings[0].message).toContain('40,000') // shortfall
    })

    it('no warning when expense fits within cash savings', () => {
      const result = simulate(
        makeInputs({
          currentAge: 40,
          retirementAge: 60,
          longevity: 61,
          cashSavingsBalance: 50_000,
          oneOffExpenses: [{ year: 2026, amount: 10_000 }],
          equityGrowthPct: 0,
          bondRatePct: 0,
          cashRatePct: 0,
          inflationPct: 0,
        }),
      )

      const expenseWarnings = result.warnings.filter(w => w.type === 'expense_exceeds_cash')
      expect(expenseWarnings).toHaveLength(0)
    })

    it('only triggered once per calendar year', () => {
      const result = simulate(
        makeInputs({
          currentAge: 40,
          retirementAge: 60,
          longevity: 61,
          cashSavingsBalance: 100_000,
          oneOffExpenses: [{ year: 2026, amount: 10_000 }],
          equityGrowthPct: 0,
          bondRatePct: 0,
          cashRatePct: 0,
          inflationPct: 0,
          monthlyISA: 0,
          employeePensionPct: 0,
          employerPensionPct: 0,
        }),
      )

      // Cash savings after month 0 should be ~90,000 (100k - 10k)
      // If triggered 12 times, it would be much lower
      expect(result.months[0].balancesNominal.cashSavings).toBeCloseTo(90_000, -2)
      // Should stay roughly the same for remaining months of that year
      expect(result.months[11].balancesNominal.cashSavings).toBeCloseTo(90_000, -2)
    })

    // --- Cascading pre-retirement expense tests ---

    it('pre-retirement cascading: fully covered by cash savings', () => {
      const result = simulate(
        makeInputs({
          currentAge: 40,
          retirementAge: 60,
          longevity: 61,
          cashSavingsBalance: 30_000,
          cashISABalance: 10_000,
          ssISABalance: 20_000,
          oneOffExpenses: [{ year: 2026, amount: 10_000 }],
          equityGrowthPct: 0,
          bondRatePct: 0,
          cashRatePct: 0,
          inflationPct: 0,
          monthlyISA: 0,
          employeePensionPct: 0,
          employerPensionPct: 0,
        }),
      )

      // Only cash savings should be reduced
      expect(result.months[0].balancesNominal.cashSavings).toBeCloseTo(20_000, -2)
      expect(result.months[0].balancesNominal.cashISA).toBeCloseTo(10_000, -2)
      expect(result.months[0].balancesNominal.ssISA.equities +
             result.months[0].balancesNominal.ssISA.bonds).toBeCloseTo(20_000, -2)

      // No warnings
      const expenseWarnings = result.warnings.filter(w => w.type === 'expense_exceeds_cash')
      expect(expenseWarnings).toHaveLength(0)
    })

    it('pre-retirement cascading: requires drawing from cash ISA', () => {
      const result = simulate(
        makeInputs({
          currentAge: 40,
          retirementAge: 60,
          longevity: 61,
          cashSavingsBalance: 5_000,
          cashISABalance: 10_000,
          ssISABalance: 20_000,
          oneOffExpenses: [{ year: 2026, amount: 12_000 }],
          equityGrowthPct: 0,
          bondRatePct: 0,
          cashRatePct: 0,
          inflationPct: 0,
          monthlyISA: 0,
          employeePensionPct: 0,
          employerPensionPct: 0,
        }),
      )

      // Cash savings exhausted
      expect(result.months[0].balancesNominal.cashSavings).toBeCloseTo(0, -1)
      // Cash ISA reduced by remaining £7,000
      expect(result.months[0].balancesNominal.cashISA).toBeCloseTo(3_000, -2)
      // S&S ISA untouched
      expect(result.months[0].balancesNominal.ssISA.equities +
             result.months[0].balancesNominal.ssISA.bonds).toBeCloseTo(20_000, -2)

      // No warnings (covered by available funds)
      const expenseWarnings = result.warnings.filter(w => w.type === 'expense_exceeds_cash')
      expect(expenseWarnings).toHaveLength(0)
    })

    it('pre-retirement cascading: requires drawing from S&S ISA (pro-rata)', () => {
      const result = simulate(
        makeInputs({
          currentAge: 40,
          retirementAge: 60,
          longevity: 61,
          cashSavingsBalance: 3_000,
          cashISABalance: 2_000,
          ssISABalance: 20_000,
          stockBondSplitPct: 70, // 70% equities, 30% bonds
          oneOffExpenses: [{ year: 2026, amount: 10_000 }],
          equityGrowthPct: 0,
          bondRatePct: 0,
          cashRatePct: 0,
          inflationPct: 0,
          monthlyISA: 0,
          employeePensionPct: 0,
          employerPensionPct: 0,
        }),
      )

      // Cash savings and Cash ISA exhausted
      expect(result.months[0].balancesNominal.cashSavings).toBeCloseTo(0, -1)
      expect(result.months[0].balancesNominal.cashISA).toBeCloseTo(0, -1)

      // S&S ISA reduced by £5,000 (10k - 3k - 2k) pro-rata
      // Initial: £14k equities, £6k bonds
      // After drawing £5k: £10.5k equities (75% of remaining £15k), £4.5k bonds (25%)
      const ssISATotal = result.months[0].balancesNominal.ssISA.equities +
                         result.months[0].balancesNominal.ssISA.bonds
      expect(ssISATotal).toBeCloseTo(15_000, -2)

      // Pro-rata: 70% equities, 30% bonds maintained
      expect(result.months[0].balancesNominal.ssISA.equities).toBeCloseTo(10_500, -2)
      expect(result.months[0].balancesNominal.ssISA.bonds).toBeCloseTo(4_500, -2)

      // No warnings
      const expenseWarnings = result.warnings.filter(w => w.type === 'expense_exceeds_cash')
      expect(expenseWarnings).toHaveLength(0)
    })

    it('pre-retirement cascading: exceeds all available funds (shortfall)', () => {
      const result = simulate(
        makeInputs({
          currentAge: 40,
          retirementAge: 60,
          longevity: 61,
          cashSavingsBalance: 5_000,
          cashISABalance: 3_000,
          ssISABalance: 7_000,
          oneOffExpenses: [{ year: 2026, amount: 20_000 }],
          equityGrowthPct: 0,
          bondRatePct: 0,
          cashRatePct: 0,
          inflationPct: 0,
          monthlyISA: 0,
          employeePensionPct: 0,
          employerPensionPct: 0,
        }),
      )

      // All accounts exhausted
      expect(result.months[0].balancesNominal.cashSavings).toBeCloseTo(0, -1)
      expect(result.months[0].balancesNominal.cashISA).toBeCloseTo(0, -1)
      expect(result.months[0].balancesNominal.ssISA.equities +
             result.months[0].balancesNominal.ssISA.bonds).toBeCloseTo(0, -1)

      // Warning about shortfall
      const expenseWarnings = result.warnings.filter(w => w.type === 'expense_exceeds_cash')
      expect(expenseWarnings).toHaveLength(1)
      expect(expenseWarnings[0].year).toBe(2026)
      // Should mention total available and shortfall
      expect(expenseWarnings[0].message).toContain('20,000')
      expect(expenseWarnings[0].message).toContain('15,000') // total available
      expect(expenseWarnings[0].message).toContain('5,000')  // shortfall
    })

    it('post-retirement: increases spending and drawdown', () => {
      const withExpense = simulate(
        makeInputs({
          currentAge: 65,
          retirementAge: 60,
          longevity: 67,
          annualSpending: 30_000,
          oneOffExpenses: [{ year: 2026, amount: 20_000 }],
          equityGrowthPct: 0,
          bondRatePct: 0,
          cashRatePct: 0,
          inflationPct: 0,
        }),
      )

      const withoutExpense = simulate(
        makeInputs({
          currentAge: 65,
          retirementAge: 60,
          longevity: 67,
          annualSpending: 30_000,
          oneOffExpenses: [],
          equityGrowthPct: 0,
          bondRatePct: 0,
          cashRatePct: 0,
          inflationPct: 0,
        }),
      )

      // Month 0 spending should be higher with the one-off
      expect(withExpense.months[0].spending).toBeGreaterThan(withoutExpense.months[0].spending)
      // The difference should be the one-off amount
      expect(withExpense.months[0].spending - withoutExpense.months[0].spending).toBeCloseTo(20_000)
    })
  })

  describe('rebalancing', () => {
    it('maintains target allocation after growth', () => {
      const stockBondSplitPct = 70
      const result = simulate(
        makeInputs({
          currentAge: 59,
          retirementAge: 60,
          longevity: 61,
          stockBondSplitPct,
          equityGrowthPct: 10, // different from bond rate
          bondRatePct: 2,
          sippBalance: 100_000,
          ssISABalance: 50_000,
        }),
      )

      // After growth with different rates, the allocation should still be 70/30
      for (const month of result.months) {
        const sippTotal =
          month.balancesNominal.sipp.equities + month.balancesNominal.sipp.bonds
        if (sippTotal > 1) {
          const eqFraction = month.balancesNominal.sipp.equities / sippTotal
          expect(eqFraction).toBeCloseTo(0.7, 5)
        }

        const ssISATotal =
          month.balancesNominal.ssISA.equities + month.balancesNominal.ssISA.bonds
        if (ssISATotal > 1) {
          const eqFraction = month.balancesNominal.ssISA.equities / ssISATotal
          expect(eqFraction).toBeCloseTo(0.7, 5)
        }
      }
    })
  })

  describe('summary', () => {
    it('yearsFunded equals longevity minus retirement when money lasts', () => {
      const result = simulate(
        makeInputs({
          currentAge: 40,
          retirementAge: 60,
          longevity: 100,
          sippBalance: 1_000_000,
          annualSpending: 10_000,
        }),
      )
      expect(result.summary.yearsFunded).toBe(40) // 100 - 60
      expect(result.summary.ageMoneyRunsOut).toBeNull()
    })
  })

  // =======================================================================
  // Step 4: Scenario-based integration tests
  // =======================================================================

  describe('integration: "Am I saving enough?"', () => {
    it('40yo with decent savings and pension — money lasts past 90', () => {
      // 40yo, £65k salary, 10%+5% pension, £500/mo ISA, retire at 60, spend £30k
      const result = simulate(
        makeInputs({
          currentAge: 40,
          retirementAge: 60,
          longevity: 100,
          salary: 65_000,
          employeePensionPct: 10,
          employerPensionPct: 5,
          monthlyISA: 500,
          annualSpending: 30_000,
          sippBalance: 150_000,
          ssISABalance: 50_000,
          cashISABalance: 10_000,
          cashSavingsBalance: 20_000,
        }),
      )

      // Money should last to longevity (past 90)
      expect(result.summary.ageMoneyRunsOut).toBeNull()

      // Retirement pot should be substantial (20 years of contributions + growth)
      expect(result.summary.totalAtRetirement).toBeGreaterThan(300_000)

      // Balances should be plausible — not zero, not absurdly high
      const retirementMonth = (60 - 40) * 12
      const atRetirement = result.months[retirementMonth - 1]
      const sippTotal =
        atRetirement.balancesReal.sipp.equities + atRetirement.balancesReal.sipp.bonds
      expect(sippTotal).toBeGreaterThan(200_000)
    })
  })

  describe('integration: "When can I retire?"', () => {
    it('later retirement = bigger pot and money lasts longer', () => {
      const baseInputs = {
        currentAge: 40,
        longevity: 100,
        salary: 65_000,
        employeePensionPct: 10,
        employerPensionPct: 5,
        monthlyISA: 500,
        annualSpending: 30_000,
        sippBalance: 100_000,
        ssISABalance: 30_000,
        cashISABalance: 5_000,
        cashSavingsBalance: 10_000,
      }

      const retireAt55 = simulate(makeInputs({ ...baseInputs, retirementAge: 55 }))
      const retireAt60 = simulate(makeInputs({ ...baseInputs, retirementAge: 60 }))
      const retireAt65 = simulate(makeInputs({ ...baseInputs, retirementAge: 65 }))

      // Later retirement = bigger pot at retirement
      expect(retireAt60.summary.totalAtRetirement).toBeGreaterThan(
        retireAt55.summary.totalAtRetirement,
      )
      expect(retireAt65.summary.totalAtRetirement).toBeGreaterThan(
        retireAt60.summary.totalAtRetirement,
      )

      // Later retirement = money lasts longer (ageMoneyRunsOut is later or null)
      // Compare the age money runs out, treating null (money lasts) as Infinity
      const ageOut = (r: typeof retireAt55) =>
        r.summary.ageMoneyRunsOut ?? Infinity
      expect(ageOut(retireAt60)).toBeGreaterThanOrEqual(ageOut(retireAt55))
      expect(ageOut(retireAt65)).toBeGreaterThanOrEqual(ageOut(retireAt60))
    })
  })

  describe('integration: shortfall scenario', () => {
    it('low savings + high spending — money runs out and age is reported', () => {
      const result = simulate(
        makeInputs({
          currentAge: 60,
          retirementAge: 60,
          longevity: 100,
          sippBalance: 50_000,
          ssISABalance: 20_000,
          cashISABalance: 5_000,
          cashSavingsBalance: 5_000,
          annualSpending: 40_000,
          equityGrowthPct: 4,
          bondRatePct: 2,
          cashRatePct: 2,
          inflationPct: 2,
          statePensionAge: 68,
          statePensionAmount: 11_500,
        }),
      )

      // Money should run out well before 100
      expect(result.summary.ageMoneyRunsOut).not.toBeNull()
      expect(result.summary.ageMoneyRunsOut!).toBeLessThan(85)
      expect(result.summary.ageMoneyRunsOut!).toBeGreaterThan(60)

      // yearsFunded should match
      expect(result.summary.yearsFunded).toBeCloseTo(
        result.summary.ageMoneyRunsOut! - 60,
        0,
      )
    })
  })

  describe('integration: drawdown order matters', () => {
    it('SIPP-last defers tax and produces better outcome than SIPP-first', () => {
      // Start at 68 so state pension is active and SIPP marginal rate is non-zero
      const baseInputs = {
        currentAge: 68,
        retirementAge: 60,
        longevity: 100,
        sippBalance: 200_000,
        ssISABalance: 100_000,
        cashISABalance: 20_000,
        cashSavingsBalance: 30_000,
        annualSpending: 25_000,
        statePensionAge: 68,
        statePensionAmount: 15_000, // above personal allowance so marginal rate > 0
      }

      const sippLast = simulate(
        makeInputs({ ...baseInputs, drawdownOrder: ['Cash', 'ISA', 'SIPP'] }),
      )
      const sippFirst = simulate(
        makeInputs({ ...baseInputs, drawdownOrder: ['SIPP', 'ISA', 'Cash'] }),
      )

      // SIPP-first should pay more total tax (drawing taxable SIPP first)
      const totalTaxSippFirst = sippFirst.months.reduce((sum, m) => sum + m.taxPaid, 0)
      const totalTaxSippLast = sippLast.months.reduce((sum, m) => sum + m.taxPaid, 0)
      expect(totalTaxSippFirst).toBeGreaterThan(totalTaxSippLast)

      // SIPP-last should result in better outcome (more years funded or higher final balance)
      if (sippLast.summary.ageMoneyRunsOut === null) {
        // SIPP-last money lasts: either SIPP-first also lasts (with lower final balance)
        // or SIPP-first runs out
        if (sippFirst.summary.ageMoneyRunsOut !== null) {
          // SIPP-last outlasts SIPP-first — clear win
          expect(true).toBe(true)
        } else {
          // Both last, but SIPP-last should have higher final balance
          const lastMonth = sippLast.months.length - 1
          expect(sippLast.months[lastMonth].totalReal).toBeGreaterThan(
            sippFirst.months[lastMonth].totalReal,
          )
        }
      } else {
        // SIPP-last runs out too, but should last longer
        expect(sippLast.summary.yearsFunded).toBeGreaterThanOrEqual(
          sippFirst.summary.yearsFunded,
        )
      }
    })
  })

  describe('integration: state pension impact', () => {
    it('reaching state pension age reduces drawdown rate and extends funding', () => {
      const baseInputs = {
        currentAge: 60,
        retirementAge: 60,
        longevity: 100,
        sippBalance: 250_000,
        ssISABalance: 80_000,
        cashISABalance: 15_000,
        cashSavingsBalance: 25_000,
        annualSpending: 25_000,
        equityGrowthPct: 5,
        bondRatePct: 3,
        cashRatePct: 2,
        inflationPct: 2,
      }

      const withSP = simulate(
        makeInputs({ ...baseInputs, statePensionAge: 68, statePensionAmount: 11_500 }),
      )
      const withoutSP = simulate(
        makeInputs({ ...baseInputs, statePensionAge: 110, statePensionAmount: 11_500 }),
      )

      // State pension should extend funding (or both last, but with-SP has higher balance)
      const ageOut = (r: typeof withSP) => r.summary.ageMoneyRunsOut ?? Infinity
      expect(ageOut(withSP)).toBeGreaterThan(ageOut(withoutSP))

      // After state pension age (month 96 = age 68), total balance should be higher with SP
      const month100 = 100
      if (month100 < withSP.months.length && month100 < withoutSP.months.length) {
        expect(withSP.months[month100].totalNominal).toBeGreaterThan(
          withoutSP.months[month100].totalNominal,
        )
      }
    })
  })

  describe('integration: spending step-down', () => {
    it('step-down at 80 extends funding compared to flat spending', () => {
      const baseInputs = {
        currentAge: 65,
        retirementAge: 60,
        longevity: 100,
        sippBalance: 200_000,
        ssISABalance: 50_000,
        cashISABalance: 10_000,
        cashSavingsBalance: 20_000,
        annualSpending: 30_000,
      }

      const withStepDown = simulate(
        makeInputs({
          ...baseInputs,
          spendingStepDowns: [{ age: 80, amount: 20_000 }],
        }),
      )
      const flatSpending = simulate(makeInputs(baseInputs))

      // Step-down should extend funding
      expect(withStepDown.summary.yearsFunded).toBeGreaterThan(
        flatSpending.summary.yearsFunded,
      )

      // Before step-down (e.g. age 75, month 120), spending should be the same
      const month75 = (75 - 65) * 12
      expect(withStepDown.months[month75].spending).toBeCloseTo(
        flatSpending.months[month75].spending,
      )

      // After step-down (e.g. age 82, month 204), spending should be lower
      const month82 = (82 - 65) * 12
      expect(withStepDown.months[month82].spending).toBeLessThan(
        flatSpending.months[month82].spending,
      )
    })
  })

  describe('integration: one-off expenses', () => {
    it('large pre-retirement expense visibly reduces cash savings', () => {
      const withExpense = simulate(
        makeInputs({
          currentAge: 40,
          retirementAge: 60,
          longevity: 61,
          cashSavingsBalance: 30_000,
          oneOffExpenses: [{ year: 2030, amount: 15_000 }],
          cashRatePct: 0,
          inflationPct: 0,
        }),
      )
      const withoutExpense = simulate(
        makeInputs({
          currentAge: 40,
          retirementAge: 60,
          longevity: 61,
          cashSavingsBalance: 30_000,
          oneOffExpenses: [],
          cashRatePct: 0,
          inflationPct: 0,
        }),
      )

      // After the expense year (month 48+), cash should be ~15k lower
      const month50 = 50
      const diff =
        withoutExpense.months[month50].balancesNominal.cashSavings -
        withExpense.months[month50].balancesNominal.cashSavings
      expect(diff).toBeCloseTo(15_000, -2)
    })

    it('large post-retirement expense causes a visible drawdown spike', () => {
      const result = simulate(
        makeInputs({
          currentAge: 65,
          retirementAge: 60,
          longevity: 70,
          annualSpending: 24_000,
          oneOffExpenses: [{ year: 2028, amount: 30_000 }],
          equityGrowthPct: 0,
          bondRatePct: 0,
          cashRatePct: 0,
          inflationPct: 0,
        }),
      )

      // The month with the one-off should have much higher spending than normal
      const normalMonthlySpending = 24_000 / 12 // £2k
      const expenseMonth = result.months.find(
        (m) => m.spending > normalMonthlySpending * 5,
      )
      expect(expenseMonth).toBeDefined()
      expect(expenseMonth!.spending).toBeCloseTo(normalMonthlySpending + 30_000)
    })
  })

  describe('integration: growth rate sensitivity', () => {
    it('higher equity growth = more money at retirement', () => {
      const baseInputs = {
        currentAge: 40,
        retirementAge: 60,
        longevity: 100,
        bondRatePct: 2,
        cashRatePct: 2,
        inflationPct: 2,
      }

      const lowGrowth = simulate(
        makeInputs({ ...baseInputs, equityGrowthPct: 3 }),
      )
      const highGrowth = simulate(
        makeInputs({ ...baseInputs, equityGrowthPct: 8 }),
      )

      expect(highGrowth.summary.totalAtRetirement).toBeGreaterThan(
        lowGrowth.summary.totalAtRetirement,
      )
    })

    it('zero real growth = much earlier shortfall than positive real growth', () => {
      const baseInputs = {
        currentAge: 60,
        retirementAge: 60,
        longevity: 100,
        sippBalance: 200_000,
        ssISABalance: 50_000,
        cashISABalance: 10_000,
        cashSavingsBalance: 20_000,
        annualSpending: 25_000,
        inflationPct: 3,
        statePensionAge: 68,
        statePensionAmount: 11_500,
      }

      // Zero real growth: all rates = inflation
      const zeroReal = simulate(
        makeInputs({
          ...baseInputs,
          equityGrowthPct: 3,
          bondRatePct: 3,
          cashRatePct: 3,
        }),
      )

      // Positive real growth
      const positiveReal = simulate(
        makeInputs({
          ...baseInputs,
          equityGrowthPct: 7,
          bondRatePct: 5,
          cashRatePct: 4,
        }),
      )

      // Zero real growth should run out sooner (or both last, with lower final balance)
      if (zeroReal.summary.ageMoneyRunsOut !== null) {
        if (positiveReal.summary.ageMoneyRunsOut !== null) {
          expect(zeroReal.summary.ageMoneyRunsOut).toBeLessThan(
            positiveReal.summary.ageMoneyRunsOut,
          )
        } else {
          // Zero runs out, positive doesn't — clearly worse
          expect(true).toBe(true)
        }
      } else {
        // Both last — positive real growth should have higher final balance
        const lastMonth = zeroReal.months.length - 1
        expect(positiveReal.months[lastMonth].totalReal).toBeGreaterThan(
          zeroReal.months[lastMonth].totalReal,
        )
      }
    })
  })

  describe('integration: all values in today\'s money', () => {
    it('balance growing at exactly inflation stays flat in real terms', () => {
      const inflationPct = 3
      const result = simulate(
        makeInputs({
          currentAge: 65,
          retirementAge: 65,
          longevity: 85,
          // All rates = inflation, so real growth is zero
          equityGrowthPct: inflationPct,
          bondRatePct: inflationPct,
          cashRatePct: inflationPct,
          inflationPct,
          // Zero spending so balances only change due to growth
          annualSpending: 0,
          statePensionAge: 90, // no state pension
          sippBalance: 100_000,
          ssISABalance: 50_000,
          cashISABalance: 10_000,
          cashSavingsBalance: 20_000,
        }),
      )

      const initialReal = result.months[0].totalReal
      // After 10 years, real value should be roughly the same
      const month120 = result.months[120]
      expect(month120.totalReal).toBeCloseTo(initialReal, -2)

      // After 19 years, still roughly the same
      const lastMonth = result.months[result.months.length - 1]
      expect(lastMonth.totalReal).toBeCloseTo(initialReal, -2)

      // But nominal should have grown significantly
      expect(lastMonth.totalNominal).toBeGreaterThan(initialReal * 1.3)
    })
  })

  describe('integration: pre-retirement expense cascading', () => {
    it('large expense cascades through cash → cash ISA → S&S ISA correctly', () => {
      const result = simulate(
        makeInputs({
          currentAge: 40,
          retirementAge: 60,
          longevity: 100,
          cashSavingsBalance: 15_000,
          cashISABalance: 10_000,
          ssISABalance: 30_000,
          sippBalance: 150_000,
          stockBondSplitPct: 70,
          oneOffExpenses: [{ year: 2026, amount: 40_000, description: 'Home renovation' }],
          equityGrowthPct: 0,
          bondRatePct: 0,
          cashRatePct: 0,
          inflationPct: 0,
          monthlyISA: 0,
          employeePensionPct: 0,
          employerPensionPct: 0,
        }),
      )

      // Find the month where the expense hits (first month of 2026, which is month 0)
      const expenseMonth = result.months[0]

      // Initial total cash + ISAs = 15k + 10k + 30k = 55k
      // After expense of 40k:
      // - Cash savings: 15k → 0 (used 15k)
      // - Cash ISA: 10k → 0 (used 10k)
      // - S&S ISA: 30k → 15k (used 15k)
      // Total drawn: 15k + 10k + 15k = 40k ✓

      expect(expenseMonth.balancesNominal.cashSavings).toBeCloseTo(0, -1)
      expect(expenseMonth.balancesNominal.cashISA).toBeCloseTo(0, -1)

      // S&S ISA should have 15k left (30k - 15k), still maintaining 70/30 split
      const ssISATotal = expenseMonth.balancesNominal.ssISA.equities +
                         expenseMonth.balancesNominal.ssISA.bonds
      expect(ssISATotal).toBeCloseTo(15_000, -2)
      expect(expenseMonth.balancesNominal.ssISA.equities / ssISATotal).toBeCloseTo(0.7, 1)

      // SIPP should be untouched
      expect(expenseMonth.balancesNominal.sipp.equities +
             expenseMonth.balancesNominal.sipp.bonds).toBeCloseTo(150_000, -2)

      // Simulation should continue normally after the expense
      // Retirement is at age 60 (month 240 = 20 years × 12)
      const retirementMonth = result.months[239] // last pre-retirement month
      expect(retirementMonth.isRetired).toBe(false)
      expect(result.months[240].isRetired).toBe(true)
      expect(retirementMonth.totalNominal).toBeGreaterThan(0)

      // No warnings since expense is fully covered
      const expenseWarnings = result.warnings.filter(w => w.type === 'expense_exceeds_cash')
      expect(expenseWarnings).toHaveLength(0)
    })

    it('handles multiple cascading expenses in different years', () => {
      const result = simulate(
        makeInputs({
          currentAge: 40,
          retirementAge: 60,
          longevity: 65,
          cashSavingsBalance: 20_000,
          cashISABalance: 15_000,
          ssISABalance: 25_000,
          sippBalance: 100_000,
          stockBondSplitPct: 60,
          oneOffExpenses: [
            { year: 2026, amount: 18_000, description: 'Wedding' },
            { year: 2029, amount: 25_000, description: 'New car' },
          ],
          equityGrowthPct: 0,
          bondRatePct: 0,
          cashRatePct: 0,
          inflationPct: 0,
          monthlyISA: 0,
          employeePensionPct: 0,
          employerPensionPct: 0,
        }),
      )

      // After first expense (2026, month 0): 18k drawn
      // Cash: 20k → 2k
      const afterFirst = result.months[0]
      expect(afterFirst.balancesNominal.cashSavings).toBeCloseTo(2_000, -2)
      expect(afterFirst.balancesNominal.cashISA).toBeCloseTo(15_000, -2)
      expect(afterFirst.balancesNominal.ssISA.equities +
             afterFirst.balancesNominal.ssISA.bonds).toBeCloseTo(25_000, -2)

      // After second expense (2029, month 36): 25k drawn from remaining funds
      // Cash: 2k → 0 (used 2k)
      // Cash ISA: 15k → 0 (used 15k)
      // S&S ISA: 25k → 17k (used 8k)
      // Total drawn: 2k + 15k + 8k = 25k ✓
      const afterSecond = result.months[36]
      expect(afterSecond.balancesNominal.cashSavings).toBeCloseTo(0, -1)
      expect(afterSecond.balancesNominal.cashISA).toBeCloseTo(0, -1)
      expect(afterSecond.balancesNominal.ssISA.equities +
             afterSecond.balancesNominal.ssISA.bonds).toBeCloseTo(17_000, -2)

      // No warnings
      const expenseWarnings = result.warnings.filter(w => w.type === 'expense_exceeds_cash')
      expect(expenseWarnings).toHaveLength(0)
    })
  })

  describe('performance', () => {
    it('completes a full 60-year simulation in under 50ms', () => {
      const inputs = makeInputs({
        currentAge: 40,
        retirementAge: 60,
        longevity: 100,
      })

      // Warm up
      simulate(inputs)

      const start = performance.now()
      const iterations = 10
      for (let i = 0; i < iterations; i++) {
        simulate(inputs)
      }
      const elapsed = (performance.now() - start) / iterations

      // Engine itself should be well under 50ms; the 200ms budget
      // includes React rendering, so engine has plenty of headroom.
      expect(elapsed).toBeLessThan(50)
    })
  })
})
