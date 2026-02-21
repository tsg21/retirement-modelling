import type { Inputs, YearProjection } from '../types'
import { simulate } from '../engine/simulate'
import type { MonthSnapshot, SimulationWarning } from '../engine/types'

export interface ProjectionResult {
  data: YearProjection[]
  warnings: SimulationWarning[]
}

/**
 * Run the simulation engine and convert monthly output to annual projections.
 */
export function generateProjection(inputs: Inputs): ProjectionResult {
  const result = simulate(inputs)
  return {
    data: monthsToAnnual(result.months),
    warnings: result.warnings,
  }
}

/**
 * Convert monthly snapshots to annual YearProjection rows.
 * Takes the last month of each age year for balances (in today's money),
 * and sums monthly flows (deflated to today's money).
 */
export function monthsToAnnual(months: MonthSnapshot[]): YearProjection[] {
  const data: YearProjection[] = []

  // Group months by integer age
  const byAge = new Map<number, MonthSnapshot[]>()
  for (const m of months) {
    const intAge = Math.floor(m.age)
    if (!byAge.has(intAge)) byAge.set(intAge, [])
    byAge.get(intAge)!.push(m)
  }

  for (const [age, snapshots] of byAge) {
    const last = snapshots[snapshots.length - 1]
    const deflator = last.cumulativeInflation

    // Sum monthly flows and deflate to today's money
    let totalContributions = 0
    let totalSpending = 0
    let totalTax = 0
    for (const m of snapshots) {
      totalContributions += m.contributions
      totalSpending += m.spending
      totalTax += m.taxPaid
    }

    const real = last.balancesReal
    data.push({
      age,
      salary: Math.round(last.salary / deflator),
      contributions: Math.round(totalContributions / deflator),
      spending: Math.round(totalSpending / deflator),
      sippBalance: Math.round(real.sipp.equities + real.sipp.bonds),
      isaBalance: Math.round(real.ssISA.equities + real.ssISA.bonds + real.cashISA),
      cashBalance: Math.round(real.cashSavings),
      totalNetWorth: Math.round(last.totalReal),
      taxPaid: Math.round(totalTax / deflator),
    })
  }

  return data
}

export function computeSummary(data: YearProjection[], inputs: Inputs) {
  const retirementRow = data.find(d => d.age === inputs.retirementAge)
  const totalAtRetirement = retirementRow?.totalNetWorth ?? 0

  const runsOutRow = data.find(d => d.age >= inputs.retirementAge && d.totalNetWorth <= 0)
  const runsOutAge = runsOutRow?.age ?? null

  const yearsFunded = runsOutAge
    ? runsOutAge - inputs.retirementAge
    : inputs.longevity - inputs.retirementAge

  const outcome = runsOutAge
    ? `Shortfall from age ${runsOutAge}`
    : `Money lasts to age ${inputs.longevity}`

  const status: 'green' | 'amber' | 'red' = runsOutAge
    ? runsOutAge - inputs.retirementAge < 20 ? 'red' : 'amber'
    : 'green'

  return { totalAtRetirement, yearsFunded, outcome, status }
}
