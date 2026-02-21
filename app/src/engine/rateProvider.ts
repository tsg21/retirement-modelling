/**
 * Rate providers for the simulation engine.
 *
 * A RateProvider returns growth and inflation rates for each simulation month.
 * - fixedRateProvider: returns constant rates from user inputs (deterministic mode)
 * - historicalRateProvider: returns rates from historical data, falling back to
 *   fixed assumptions when the data runs out (backtesting mode)
 */

import type { Inputs } from '@/types'
import type { MonthlyRates, RateProvider } from './types'
import type { MonthlyRateOverrides } from '@/data/scenarioBuilder'

/**
 * Convert a monthly return (decimal fraction) to an annual equivalent rate.
 * annual = (1 + monthly)^12 - 1
 */
function monthlyToAnnual(monthlyReturn: number): number {
  return Math.pow(1 + monthlyReturn, 12) - 1
}

/**
 * Returns a RateProvider that returns the same rates every month,
 * derived from the user's percentage inputs. This is what deterministic mode uses.
 */
export function fixedRateProvider(inputs: Inputs): RateProvider {
  const rates: MonthlyRates = {
    equityRate: inputs.equityGrowthPct / 100,
    bondRate: inputs.bondRatePct / 100,
    cashRate: inputs.cashRatePct / 100,
    inflationRate: inputs.inflationPct / 100,
  }
  return () => rates
}

/**
 * Returns a RateProvider that uses historical data for the available months,
 * then falls back to fixed assumptions when the data runs out.
 *
 * Historical data provides monthly returns (decimal fractions), which are
 * converted to annual equivalent rates to match the engine's expectations.
 *
 * @param scenarioOverrides - Monthly rate overrides from the scenario builder
 * @param fallback - Fixed rates to use when historical data runs out
 */
export function historicalRateProvider(
  scenarioOverrides: MonthlyRateOverrides[],
  fallback: MonthlyRates,
): RateProvider {
  return (monthIndex: number): MonthlyRates => {
    if (monthIndex < scenarioOverrides.length) {
      const override = scenarioOverrides[monthIndex]
      return {
        equityRate: monthlyToAnnual(override.equityReturn),
        bondRate: monthlyToAnnual(override.bondReturn),
        cashRate: monthlyToAnnual(override.cashReturn),
        inflationRate: monthlyToAnnual(override.inflationRate),
      }
    }
    return fallback
  }
}
