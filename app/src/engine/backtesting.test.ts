import { describe, it, expect } from 'vitest'
import { runBacktest } from './backtesting'
import type { Inputs } from '@/types'
import type { HistoricalMonth } from '@/data/scenarioBuilder'

/**
 * Build synthetic historical data: N years of monthly data with configurable returns.
 * Each month gets the same returns (simple and predictable for testing).
 */
function makeSyntheticData(
  startYear: number,
  years: number,
  overrides: Partial<Pick<HistoricalMonth, 'equityReturn' | 'bondReturn' | 'cashReturn' | 'inflationRate'>> = {},
): HistoricalMonth[] {
  const data: HistoricalMonth[] = []
  for (let y = 0; y < years; y++) {
    for (let m = 1; m <= 12; m++) {
      data.push({
        year: startYear + y,
        month: m,
        equityReturn: overrides.equityReturn ?? 0.005,   // ~6% annual
        bondReturn: overrides.bondReturn ?? 0.003,        // ~3.7% annual
        cashReturn: overrides.cashReturn ?? 0.002,        // ~2.4% annual
        inflationRate: overrides.inflationRate ?? 0.0017,  // ~2% annual
      })
    }
  }
  return data
}

/** Simple test inputs: already retired (currentAge = retirementAge) for shorter simulations. */
function makeTestInputs(overrides: Partial<Inputs> = {}): Inputs {
  return {
    currentAge: 60,
    retirementAge: 60,
    annualSpending: 20000,
    salary: 0,
    employeePensionPct: 0,
    employerPensionPct: 0,
    monthlyISA: 0,
    ssISASplitPct: 80,
    salaryGrowthPct: 0,
    sippBalance: 200000,
    ssISABalance: 100000,
    cashISABalance: 20000,
    cashSavingsBalance: 30000,
    stockBondSplitPct: 70,
    drawdownOrder: ['Cash', 'ISA', 'SIPP'],
    spendingStepDowns: [],
    oneOffExpenses: [],
    statePensionOverride: null,
    inflationPct: 2,
    equityGrowthPct: 6,
    bondRatePct: 4,
    cashRatePct: 3,
    statePensionAge: 68,
    minPensionAge: 57,
    statePensionAmount: 11500,
    longevity: 80,
    ...overrides,
  }
}

describe('runBacktest', () => {
  it('runs one scenario per valid start year', () => {
    // 30 years of data, longevity-currentAge=20 years, minMonths=120 (10 years)
    // Valid start years: those with >=10 years of data remaining
    // Data covers years 1990-2019 (30 years), so start years 1990-2010 are valid (21 years)
    const data = makeSyntheticData(1990, 30)
    const inputs = makeTestInputs()
    const result = runBacktest(inputs, data, 120)

    // With 360 months of data and minMonths=120, we expect start years 1990..2010
    expect(result.scenarios.length).toBe(21)
    expect(result.scenarios[0].startYear).toBe(1990)
    expect(result.scenarios[result.scenarios.length - 1].startYear).toBe(2010)
  })

  it('each scenario has a valid SimulationResult', () => {
    const data = makeSyntheticData(2000, 25)
    const inputs = makeTestInputs()
    const result = runBacktest(inputs, data, 120)

    for (const scenario of result.scenarios) {
      expect(scenario.result.months.length).toBeGreaterThan(0)
      expect(scenario.result.summary).toBeDefined()
      expect(scenario.result.summary.totalAtRetirement).toBeGreaterThan(0)
    }
  })
})

describe('percentile bands', () => {
  it('computes bands for each age from currentAge to longevity', () => {
    const data = makeSyntheticData(2000, 25)
    const inputs = makeTestInputs({ longevity: 80 })
    const result = runBacktest(inputs, data, 120)

    // Should have bands from age 60 to 80 = 21 entries
    expect(result.percentileBands.length).toBe(21)
    expect(result.percentileBands[0].age).toBe(60)
    expect(result.percentileBands[result.percentileBands.length - 1].age).toBe(80)
  })

  it('percentiles are ordered: p10 <= p25 <= p50 <= p75 <= p90', () => {
    const data = makeSyntheticData(2000, 25)
    const inputs = makeTestInputs()
    const result = runBacktest(inputs, data, 120)

    for (const band of result.percentileBands) {
      expect(band.p10).toBeLessThanOrEqual(band.p25)
      expect(band.p25).toBeLessThanOrEqual(band.p50)
      expect(band.p50).toBeLessThanOrEqual(band.p75)
      expect(band.p75).toBeLessThanOrEqual(band.p90)
    }
  })

  it('with identical scenarios, all percentiles equal', () => {
    // All scenarios use the same constant returns, so results should be identical
    const data = makeSyntheticData(2000, 25)
    const inputs = makeTestInputs({ longevity: 70 })
    const result = runBacktest(inputs, data, 120)

    for (const band of result.percentileBands) {
      // All scenarios have same returns, so percentiles should be very close
      // (slight differences from different amounts of historical data before fallback)
      // For the first scenario-year's worth of data, all scenarios share identical rates
      // so check early ages are very tight
      if (band.age <= 62) {
        const spread = band.p90 - band.p10
        const mid = band.p50
        if (mid > 0) {
          // Spread should be small relative to median (within 5%)
          expect(spread / mid).toBeLessThan(0.05)
        }
      }
    }
  })

  it('varying returns produce wider percentile bands', () => {
    // Create data where early years have low returns, later years have high returns
    const lowData = makeSyntheticData(2000, 10, { equityReturn: 0.001 })
    const highData = makeSyntheticData(2010, 15, { equityReturn: 0.01 })
    const data = [...lowData, ...highData]

    const inputs = makeTestInputs({ longevity: 75 })
    const result = runBacktest(inputs, data, 120)

    // At later ages, the spread should be noticeable since some scenarios
    // started with low returns and others with high returns
    const lateBand = result.percentileBands.find(b => b.age === 70)
    expect(lateBand).toBeDefined()
    if (lateBand && lateBand.p50 > 0) {
      expect(lateBand.p90).toBeGreaterThan(lateBand.p10)
    }
  })
})

describe('success rate', () => {
  it('returns 1.0 when all scenarios fund to longevity', () => {
    // High balances, low spending, short retirement => all succeed
    const data = makeSyntheticData(2000, 25)
    const inputs = makeTestInputs({
      sippBalance: 500000,
      ssISABalance: 200000,
      annualSpending: 10000,
      longevity: 70,
    })
    const result = runBacktest(inputs, data, 120)
    expect(result.successRate).toBe(1.0)
  })

  it('returns 0.0 when no scenarios fund to longevity', () => {
    // Tiny balances, high spending => all fail
    const data = makeSyntheticData(2000, 25)
    const inputs = makeTestInputs({
      sippBalance: 10000,
      ssISABalance: 5000,
      cashISABalance: 1000,
      cashSavingsBalance: 2000,
      annualSpending: 50000,
      longevity: 90,
    })
    const result = runBacktest(inputs, data, 120)
    expect(result.successRate).toBe(0)
  })

  it('returns a value between 0 and 1 with mixed outcomes', () => {
    // Create scenarios where some succeed and some fail by using
    // varying returns across time periods
    const poorData = makeSyntheticData(2000, 10, {
      equityReturn: -0.002, // negative returns
      bondReturn: -0.001,
      cashReturn: 0.0001,
    })
    const goodData = makeSyntheticData(2010, 15, {
      equityReturn: 0.008, // strong returns
      bondReturn: 0.004,
      cashReturn: 0.003,
    })
    const data = [...poorData, ...goodData]

    const inputs = makeTestInputs({
      sippBalance: 150000,
      ssISABalance: 80000,
      cashISABalance: 10000,
      cashSavingsBalance: 15000,
      annualSpending: 25000,
      longevity: 85,
    })

    const result = runBacktest(inputs, data, 120)
    expect(result.successRate).toBeGreaterThan(0)
    expect(result.successRate).toBeLessThan(1)
  })
})

describe('worst case', () => {
  it('returns null when all scenarios succeed', () => {
    const data = makeSyntheticData(2000, 25)
    const inputs = makeTestInputs({
      sippBalance: 500000,
      ssISABalance: 200000,
      annualSpending: 10000,
      longevity: 70,
    })
    const result = runBacktest(inputs, data, 120)
    expect(result.worstCase).toBeNull()
  })

  it('identifies the scenario where money runs out earliest', () => {
    // Poor early data will make early-start scenarios fail faster
    const poorData = makeSyntheticData(2000, 10, {
      equityReturn: -0.003,
      bondReturn: -0.001,
      cashReturn: 0.0001,
    })
    const goodData = makeSyntheticData(2010, 15, {
      equityReturn: 0.008,
      bondReturn: 0.004,
      cashReturn: 0.003,
    })
    const data = [...poorData, ...goodData]

    const inputs = makeTestInputs({
      sippBalance: 100000,
      ssISABalance: 50000,
      cashISABalance: 10000,
      cashSavingsBalance: 15000,
      annualSpending: 25000,
      longevity: 85,
    })

    const result = runBacktest(inputs, data, 120)

    if (result.worstCase !== null) {
      // The worst case should be from one of the early-start-year scenarios
      // which experienced the most negative returns
      expect(result.worstCase.startYear).toBeGreaterThanOrEqual(2000)
      expect(result.worstCase.ageMoneyRunsOut).toBeGreaterThan(60)
      expect(result.worstCase.ageMoneyRunsOut).toBeLessThan(85)

      // Verify no scenario has an earlier runout age
      for (const s of result.scenarios) {
        const age = s.result.summary.ageMoneyRunsOut
        if (age !== null) {
          expect(age).toBeGreaterThanOrEqual(result.worstCase.ageMoneyRunsOut)
        }
      }
    }
  })

  it('when all scenarios fail, worst case has the earliest runout', () => {
    const data = makeSyntheticData(2000, 25)
    const inputs = makeTestInputs({
      sippBalance: 10000,
      ssISABalance: 5000,
      cashISABalance: 1000,
      cashSavingsBalance: 2000,
      annualSpending: 50000,
      longevity: 90,
    })

    const result = runBacktest(inputs, data, 120)
    expect(result.worstCase).not.toBeNull()

    // All scenarios should run out of money
    for (const s of result.scenarios) {
      expect(s.result.summary.ageMoneyRunsOut).not.toBeNull()
    }
  })
})
