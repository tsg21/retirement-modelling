import { describe, it, expect } from 'vitest'
import { simulate } from './simulate'
import { DEFAULT_INPUTS, type Inputs } from '@/types'

function makeInputs(overrides: Partial<Inputs> = {}): Inputs {
  return { ...DEFAULT_INPUTS, ...overrides }
}

describe('simulate', () => {
  describe('basic mechanics', () => {
    it('produces correct number of monthly snapshots', () => {
      const result = simulate(makeInputs({ currentAge: 40, longevity: 100 }), 2026)
      expect(result.months).toHaveLength(720) // 60 years × 12
    })

    it('age progresses correctly', () => {
      const result = simulate(makeInputs({ currentAge: 40, longevity: 43 }), 2026)
      expect(result.months[0].age).toBe(40)
      expect(result.months[1].age).toBeCloseTo(40 + 1 / 12)
      expect(result.months[11].age).toBeCloseTo(40 + 11 / 12)
      expect(result.months[12].age).toBeCloseTo(41)
    })

    it('marks retirement transition correctly', () => {
      const result = simulate(
        makeInputs({ currentAge: 58, retirementAge: 60, longevity: 62 }),
        2026,
      )
      const retirementMonth = 24 // (60 - 58) * 12
      expect(result.months[retirementMonth - 1].isRetired).toBe(false)
      expect(result.months[retirementMonth].isRetired).toBe(true)
    })

    it('cumulative inflation advances each month', () => {
      const result = simulate(
        makeInputs({ currentAge: 40, longevity: 41, inflationPct: 2 }),
        2026,
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
        2026,
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
      const result = simulate(inputs, 2026)

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
        2026,
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
        2026,
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
        2026,
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
        2026,
      )
      const retirementMonthIndex = 24
      // totalAtRetirement should match the last pre-retirement snapshot's totalReal
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
      const result = simulate(inputs, 2026)

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
      const result = simulate(inputs, 2026)

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
        2026,
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
        2026,
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
        2026,
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
        2026,
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
        2026,
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
        2026,
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
        2026,
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
        2026,
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
        2026,
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
        2026,
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

      const withExpense = simulate(inputs, 2026)
      const withoutExpense = simulate(
        makeInputs({
          ...inputs,
          oneOffExpenses: [],
        }),
        2026,
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
          oneOffExpenses: [{ year: 2026, amount: 50_000 }],
          equityGrowthPct: 0,
          bondRatePct: 0,
          cashRatePct: 0,
          inflationPct: 0,
        }),
        2026,
      )

      // Cash savings should not go negative
      for (const month of result.months) {
        expect(month.balancesNominal.cashSavings).toBeGreaterThanOrEqual(0)
      }
    })

    it('warns when pre-retirement expense exceeds cash savings', () => {
      const result = simulate(
        makeInputs({
          currentAge: 40,
          retirementAge: 60,
          longevity: 61,
          cashSavingsBalance: 5_000,
          oneOffExpenses: [{ year: 2026, amount: 50_000 }],
          equityGrowthPct: 0,
          bondRatePct: 0,
          cashRatePct: 0,
          inflationPct: 0,
        }),
        2026,
      )

      const expenseWarnings = result.warnings.filter(w => w.type === 'expense_exceeds_cash')
      expect(expenseWarnings).toHaveLength(1)
      expect(expenseWarnings[0].year).toBe(2026)
      expect(expenseWarnings[0].message).toContain('50,000')
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
        2026,
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
        2026,
      )

      // Cash savings after month 0 should be ~90,000 (100k - 10k)
      // If triggered 12 times, it would be much lower
      expect(result.months[0].balancesNominal.cashSavings).toBeCloseTo(90_000, -2)
      // Should stay roughly the same for remaining months of that year
      expect(result.months[11].balancesNominal.cashSavings).toBeCloseTo(90_000, -2)
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
        2026,
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
        2026,
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
        2026,
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
        2026,
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
        2026,
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

      const retireAt55 = simulate(makeInputs({ ...baseInputs, retirementAge: 55 }), 2026)
      const retireAt60 = simulate(makeInputs({ ...baseInputs, retirementAge: 60 }), 2026)
      const retireAt65 = simulate(makeInputs({ ...baseInputs, retirementAge: 65 }), 2026)

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
        2026,
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
        2026,
      )
      const sippFirst = simulate(
        makeInputs({ ...baseInputs, drawdownOrder: ['SIPP', 'ISA', 'Cash'] }),
        2026,
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
        2026,
      )
      const withoutSP = simulate(
        makeInputs({ ...baseInputs, statePensionAge: 110, statePensionAmount: 11_500 }),
        2026,
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
        2026,
      )
      const flatSpending = simulate(makeInputs(baseInputs), 2026)

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
        2026,
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
        2026,
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
        2026,
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
        2026,
      )
      const highGrowth = simulate(
        makeInputs({ ...baseInputs, equityGrowthPct: 8 }),
        2026,
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
        2026,
      )

      // Positive real growth
      const positiveReal = simulate(
        makeInputs({
          ...baseInputs,
          equityGrowthPct: 7,
          bondRatePct: 5,
          cashRatePct: 4,
        }),
        2026,
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
        2026,
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

  describe('performance', () => {
    it('completes a full 60-year simulation in under 50ms', () => {
      const inputs = makeInputs({
        currentAge: 40,
        retirementAge: 60,
        longevity: 100,
      })

      // Warm up
      simulate(inputs, 2026)

      const start = performance.now()
      const iterations = 10
      for (let i = 0; i < iterations; i++) {
        simulate(inputs, 2026)
      }
      const elapsed = (performance.now() - start) / iterations

      // Engine itself should be well under 50ms; the 200ms budget
      // includes React rendering, so engine has plenty of headroom.
      expect(elapsed).toBeLessThan(50)
    })
  })
})
