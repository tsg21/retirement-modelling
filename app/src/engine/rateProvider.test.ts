import { describe, it, expect } from 'vitest'
import { fixedRateProvider, historicalRateProvider } from './rateProvider'
import { DEFAULT_INPUTS } from '@/types'
import { simulate } from './simulate'
import type { MonthlyRateOverrides } from '@/data/scenarioBuilder'
import type { MonthlyRates } from './types'

describe('fixedRateProvider', () => {
  it('returns constant rates derived from inputs', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      equityGrowthPct: 6,
      bondRatePct: 2,
      cashRatePct: 3,
      inflationPct: 2.5,
    }
    const provider = fixedRateProvider(inputs)

    const rates = provider(0)
    expect(rates.equityRate).toBe(0.06)
    expect(rates.bondRate).toBe(0.02)
    expect(rates.cashRate).toBe(0.03)
    expect(rates.inflationRate).toBe(0.025)
  })

  it('returns the same rates for any month index', () => {
    const provider = fixedRateProvider(DEFAULT_INPUTS)
    const rates0 = provider(0)
    const rates100 = provider(100)
    const rates999 = provider(999)

    expect(rates0).toEqual(rates100)
    expect(rates0).toEqual(rates999)
  })
})

describe('historicalRateProvider', () => {
  // Synthetic scenario: 3 months of historical data
  const overrides: MonthlyRateOverrides[] = [
    { equityReturn: 0.02, bondReturn: 0.005, cashReturn: 0.003, inflationRate: 0.002 },
    { equityReturn: -0.01, bondReturn: 0.004, cashReturn: 0.003, inflationRate: 0.001 },
    { equityReturn: 0.03, bondReturn: 0.006, cashReturn: 0.003, inflationRate: 0.003 },
  ]
  const fallback: MonthlyRates = {
    equityRate: 0.06,
    bondRate: 0.02,
    cashRate: 0.03,
    inflationRate: 0.025,
  }

  it('returns historical rates converted to annual equivalents', () => {
    const provider = historicalRateProvider(overrides, fallback)
    const rates = provider(0)

    // monthly 0.02 → annual = (1.02)^12 - 1 ≈ 0.2682
    expect(rates.equityRate).toBeCloseTo(Math.pow(1.02, 12) - 1, 10)
    expect(rates.bondRate).toBeCloseTo(Math.pow(1.005, 12) - 1, 10)
    expect(rates.cashRate).toBeCloseTo(Math.pow(1.003, 12) - 1, 10)
    expect(rates.inflationRate).toBeCloseTo(Math.pow(1.002, 12) - 1, 10)
  })

  it('returns correct rates for each month within data range', () => {
    const provider = historicalRateProvider(overrides, fallback)

    // Month 1: negative equity return
    const rates1 = provider(1)
    expect(rates1.equityRate).toBeCloseTo(Math.pow(1 + (-0.01), 12) - 1, 10)

    // Month 2
    const rates2 = provider(2)
    expect(rates2.equityRate).toBeCloseTo(Math.pow(1.03, 12) - 1, 10)
  })

  it('falls back to fixed rates when historical data runs out', () => {
    const provider = historicalRateProvider(overrides, fallback)

    // Month 3 is beyond the 3-month data
    const rates3 = provider(3)
    expect(rates3).toEqual(fallback)

    // Much later too
    const rates100 = provider(100)
    expect(rates100).toEqual(fallback)
  })

  it('transition from historical to fallback is seamless', () => {
    const provider = historicalRateProvider(overrides, fallback)

    // Last historical month
    const lastHistorical = provider(2)
    expect(lastHistorical.equityRate).toBeCloseTo(Math.pow(1.03, 12) - 1, 10)

    // First fallback month
    const firstFallback = provider(3)
    expect(firstFallback.equityRate).toBe(0.06)
  })
})

describe('simulate with explicit fixedRateProvider', () => {
  it('produces identical results to default (no provider) simulation', () => {
    const inputs = {
      ...DEFAULT_INPUTS,
      currentAge: 58,
      retirementAge: 60,
      longevity: 65,
    }

    const defaultResult = simulate(inputs, 2026)
    const explicitResult = simulate(inputs, 2026, fixedRateProvider(inputs))

    // Same number of months
    expect(explicitResult.months).toHaveLength(defaultResult.months.length)

    // Same summary
    expect(explicitResult.summary).toEqual(defaultResult.summary)

    // Same balances at each month
    for (let i = 0; i < defaultResult.months.length; i++) {
      expect(explicitResult.months[i].totalReal).toBeCloseTo(defaultResult.months[i].totalReal, 6)
      expect(explicitResult.months[i].totalNominal).toBeCloseTo(defaultResult.months[i].totalNominal, 6)
    }
  })
})

describe('simulate with historicalRateProvider', () => {
  it('uses historical rates for available months then falls back', () => {
    // Create a scenario where historical rates differ significantly from fixed
    const highGrowthMonth: MonthlyRateOverrides = {
      equityReturn: 0.05, // 5% monthly = very high
      bondReturn: 0.01,
      cashReturn: 0.005,
      inflationRate: 0.001,
    }
    // 12 months of high growth, then fallback to low growth
    const overrides = Array(12).fill(highGrowthMonth)
    const fallback: MonthlyRates = {
      equityRate: 0.0,  // 0% annual growth
      bondRate: 0.0,
      cashRate: 0.0,
      inflationRate: 0.0,
    }

    const inputs = {
      ...DEFAULT_INPUTS,
      currentAge: 65,
      retirementAge: 60,
      longevity: 68,
      annualSpending: 0, // no spending so we can isolate growth
      statePensionAge: 90, // no state pension
    }

    const result = simulate(inputs, 2026, historicalRateProvider(overrides, fallback))

    // During first 12 months (historical), balances should grow
    expect(result.months[11].totalNominal).toBeGreaterThan(result.months[0].totalNominal)

    // After month 12, with 0% growth and 0% inflation and no spending,
    // balances should stay flat
    const month12 = result.months[12].totalNominal
    const month24 = result.months[24].totalNominal
    expect(month24).toBeCloseTo(month12, 0)
  })
})
