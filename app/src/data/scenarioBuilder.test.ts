import { describe, it, expect } from 'vitest'
import type { HistoricalMonth } from './historicalDataProcessing'
import { buildScenario, getAvailableScenarioStartYears } from './scenarioBuilder'
import historicalData from './historicalReturns.json'

// Small synthetic dataset for unit tests: 3 years of data (36 months)
function makeSyntheticData(): HistoricalMonth[] {
  const data: HistoricalMonth[] = []
  for (let y = 2000; y <= 2002; y++) {
    for (let m = 1; m <= 12; m++) {
      data.push({
        year: y,
        month: m,
        equityReturn: (y - 2000) * 0.01 + m * 0.001, // unique per month
        bondReturn: 0.005,
        cashReturn: 0.003,
        inflationRate: 0.002,
      })
    }
  }
  return data
}

describe('buildScenario', () => {
  const data = makeSyntheticData()

  it('returns correct rates for first month of scenario', () => {
    const scenario = buildScenario(data, 2001)
    expect(scenario[0].equityReturn).toBe(data[12].equityReturn)
    expect(scenario[0].bondReturn).toBe(data[12].bondReturn)
  })

  it('returns all remaining months from start year to end of data', () => {
    const scenario = buildScenario(data, 2001)
    // 2001-Jan to 2002-Dec = 24 months
    expect(scenario).toHaveLength(24)
  })

  it('returns correct rates for last month', () => {
    const scenario = buildScenario(data, 2001)
    expect(scenario[23].equityReturn).toBe(data[35].equityReturn)
  })

  it('returns full dataset when starting from first year', () => {
    const scenario = buildScenario(data, 2000)
    expect(scenario).toHaveLength(36)
  })

  it('strips year/month fields from output', () => {
    const scenario = buildScenario(data, 2000)
    const entry = scenario[0] as Record<string, unknown>
    expect(entry).not.toHaveProperty('year')
    expect(entry).not.toHaveProperty('month')
  })

  it('throws for invalid start year', () => {
    expect(() => buildScenario(data, 1999)).toThrow(/No historical data for year 1999/)
  })
})

describe('getAvailableScenarioStartYears', () => {
  const data = makeSyntheticData() // 36 months: 2000-2002

  it('returns all years when minimum is small', () => {
    const years = getAvailableScenarioStartYears(data, 1)
    expect(years).toEqual([2000, 2001, 2002])
  })

  it('excludes years with insufficient data', () => {
    // Require 24 months minimum. 2002 starts at index 24, only 12 months left.
    const years = getAvailableScenarioStartYears(data, 24)
    expect(years).toEqual([2000, 2001])
  })

  it('excludes all years when minimum exceeds data length', () => {
    const years = getAvailableScenarioStartYears(data, 100)
    expect(years).toEqual([])
  })

  it('returns sorted years', () => {
    const years = getAvailableScenarioStartYears(data, 12)
    for (let i = 1; i < years.length; i++) {
      expect(years[i]).toBeGreaterThan(years[i - 1])
    }
  })
})

// Integration tests using the real historical data
describe('scenarioBuilder with real data', () => {
  it('scenario starting at 1990 returns correct first month rates', () => {
    const jan1990 = historicalData.find(
      (d: HistoricalMonth) => d.year === 1990 && d.month === 1,
    )!
    const scenario = buildScenario(historicalData as HistoricalMonth[], 1990)
    expect(scenario[0].equityReturn).toBe(jan1990.equityReturn)
    expect(scenario[0].bondReturn).toBe(jan1990.bondReturn)
    expect(scenario[0].cashReturn).toBe(jan1990.cashReturn)
    expect(scenario[0].inflationRate).toBe(jan1990.inflationRate)
  })

  it('scenario starting at 1990 ends at last historical month', () => {
    const scenario = buildScenario(historicalData as HistoricalMonth[], 1990)
    const startIdx = historicalData.findIndex(
      (d: HistoricalMonth) => d.year === 1990 && d.month === 1,
    )
    expect(scenario).toHaveLength(historicalData.length - startIdx)

    const last = scenario[scenario.length - 1]
    const lastData = historicalData[historicalData.length - 1]
    expect(last.equityReturn).toBe(lastData.equityReturn)
  })

  it('available scenarios with 120-month minimum', () => {
    const years = getAvailableScenarioStartYears(historicalData as HistoricalMonth[], 120)
    expect(years[0]).toBe(1985)
    // Last valid year: need 120 months (10 years) from start.
    // Data ends 2022-03. So last start ≈ 2012.
    expect(years[years.length - 1]).toBeLessThanOrEqual(2013)
    expect(years[years.length - 1]).toBeGreaterThanOrEqual(2011)
  })
})
