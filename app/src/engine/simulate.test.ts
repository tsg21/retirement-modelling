import { describe, it, expect } from 'vitest'
import { simulate } from './simulate'
import { DEFAULT_INPUTS, type Inputs } from '@/types'
import { totalBalance } from './growth'

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
})
