/**
 * Backtesting runner and aggregation.
 *
 * Runs the simulation across all available historical scenarios and
 * computes aggregate statistics (percentile bands, success rate, worst case).
 */

import type { Inputs } from '@/types'
import type { HistoricalMonth } from '@/data/scenarioBuilder'
import type {
  BacktestResult,
  PercentileBand,
  ScenarioResult,
  SimulationResult,
  WorstCase,
} from './types'
import { buildScenario, getAvailableScenarioStartYears } from '@/data/scenarioBuilder'
import { fixedRateProvider, historicalRateProvider } from './rateProvider'
import { simulate } from './simulate'

/**
 * Run backtesting: simulate once per historical scenario start year.
 *
 * @param inputs - User inputs
 * @param historicalData - Full array of historical monthly data
 * @param minMonthsOfData - Minimum months of historical data for a scenario to be valid (default: 120 = 10 years)
 */
export function runBacktest(
  inputs: Inputs,
  historicalData: HistoricalMonth[],
  minMonthsOfData = 120,
): BacktestResult {
  const startYears = getAvailableScenarioStartYears(historicalData, minMonthsOfData)
  const fallbackRates = fixedRateProvider(inputs)(0) // constant rates from user inputs

  const scenarios: ScenarioResult[] = startYears.map(startYear => {
    const overrides = buildScenario(historicalData, startYear)
    const rateProvider = historicalRateProvider(overrides, fallbackRates)
    const result = simulate(inputs, startYear, rateProvider)
    return { startYear, result }
  })

  const percentileBands = computePercentileBands(scenarios, inputs)
  const successRate = computeSuccessRate(scenarios)
  const worstCase = findWorstCase(scenarios)

  return { scenarios, percentileBands, successRate, worstCase }
}

/**
 * Compute the Nth percentile of a sorted array using linear interpolation.
 * p is a fraction (e.g. 0.10 for 10th percentile).
 */
function percentile(sorted: number[], p: number): number {
  if (sorted.length === 0) return 0
  if (sorted.length === 1) return sorted[0]

  const index = p * (sorted.length - 1)
  const lower = Math.floor(index)
  const upper = Math.ceil(index)
  const frac = index - lower

  if (lower === upper) return sorted[lower]
  return sorted[lower] * (1 - frac) + sorted[upper] * frac
}

/**
 * Compute percentile bands for total net worth (real) at each age year.
 * Uses the snapshot closest to each integer age from each scenario.
 */
function computePercentileBands(
  scenarios: ScenarioResult[],
  inputs: Inputs,
): PercentileBand[] {
  if (scenarios.length === 0) return []

  const bands: PercentileBand[] = []

  for (let age = inputs.currentAge; age <= inputs.longevity; age++) {
    const values: number[] = []

    for (const scenario of scenarios) {
      const value = getTotalRealAtAge(scenario.result, inputs.currentAge, age)
      if (value !== null) {
        values.push(value)
      }
    }

    if (values.length === 0) continue

    values.sort((a, b) => a - b)

    bands.push({
      age,
      p10: percentile(values, 0.10),
      p25: percentile(values, 0.25),
      p50: percentile(values, 0.50),
      p75: percentile(values, 0.75),
      p90: percentile(values, 0.90),
    })
  }

  return bands
}

/**
 * Get total real net worth at a specific integer age from a simulation result.
 * Uses the month snapshot at the start of that age year (monthIndex for that age).
 */
function getTotalRealAtAge(
  result: SimulationResult,
  currentAge: number,
  targetAge: number,
): number | null {
  const monthIndex = (targetAge - currentAge) * 12
  if (monthIndex < 0 || monthIndex >= result.months.length) {
    // Age beyond simulation end — if money ran out, use 0
    if (targetAge > currentAge && result.months.length > 0) {
      return 0
    }
    return null
  }
  return result.months[monthIndex].totalReal
}

/**
 * Compute success rate: fraction of scenarios where money lasts to longevity.
 */
function computeSuccessRate(scenarios: ScenarioResult[]): number {
  if (scenarios.length === 0) return 0
  const successes = scenarios.filter(s => s.result.summary.ageMoneyRunsOut === null).length
  return successes / scenarios.length
}

/**
 * Find the worst-case scenario: the one where money runs out earliest.
 * Returns null if no scenarios run out of money.
 */
function findWorstCase(scenarios: ScenarioResult[]): WorstCase | null {
  let worst: WorstCase | null = null

  for (const scenario of scenarios) {
    const age = scenario.result.summary.ageMoneyRunsOut
    if (age !== null) {
      if (worst === null || age < worst.ageMoneyRunsOut) {
        worst = { startYear: scenario.startYear, ageMoneyRunsOut: age }
      }
    }
  }

  return worst
}
