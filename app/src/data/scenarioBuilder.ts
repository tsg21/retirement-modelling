import type { HistoricalMonth } from './historicalDataProcessing'

export type { HistoricalMonth }

export interface MonthlyRateOverrides {
  equityReturn: number // monthly decimal fraction
  bondReturn: number
  cashReturn: number
  inflationRate: number
}

/**
 * Build a scenario's rate overrides starting from a given year.
 * Returns only the months covered by historical data — no padding or fallback.
 * The rate provider (task 12) handles fallback to fixed assumptions when this runs out.
 */
export function buildScenario(
  data: HistoricalMonth[],
  startYear: number,
): MonthlyRateOverrides[] {
  const startIdx = data.findIndex(d => d.year === startYear)
  if (startIdx === -1) {
    throw new Error(`No historical data for year ${startYear}`)
  }

  return data.slice(startIdx).map(d => ({
    equityReturn: d.equityReturn,
    bondReturn: d.bondReturn,
    cashReturn: d.cashReturn,
    inflationRate: d.inflationRate,
  }))
}

/**
 * Returns the list of valid scenario start years.
 * A year is valid if at least `minMonthsOfData` months of historical data
 * are available from the first entry of that year onward.
 */
export function getAvailableScenarioStartYears(
  data: HistoricalMonth[],
  minMonthsOfData: number,
): number[] {
  const result: number[] = []
  const seenYears = new Set<number>()

  for (let i = 0; i < data.length; i++) {
    const year = data[i].year
    if (!seenYears.has(year)) {
      seenYears.add(year)
      if (data.length - i >= minMonthsOfData) {
        result.push(year)
      }
    }
  }

  return result
}
