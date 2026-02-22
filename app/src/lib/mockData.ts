import type { Inputs, YearProjection } from '../types'
import { simulate } from '../engine/simulate'
import type { MonthSnapshot, SimulationWarning } from '../engine/types'

export interface ProjectionResult {
  data: YearProjection[]
  warnings: SimulationWarning[]
}

/**
 * Run the simulation engine and convert monthly output to annual projections.
 *
 * Uses unified simulator that treats single mode as couple mode with Partner B = zero balances.
 */
export function generateProjection(inputs: Inputs): ProjectionResult {
  // Single mode is handled as a special case of couple mode
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
 *
 * In single mode: maps person data to partnerA
 * In couple mode: maps partnerA and partnerB from HouseholdMonthSnapshot
 */
export function monthsToAnnual(months: MonthSnapshot[]): YearProjection[] {
  const data: YearProjection[] = []

  // Check if we're in couple mode by looking at first snapshot
  const isCoupleMode = months.length > 0 && 'partnerA' in months[0]

  // Get starting age for simulation year calculation
  const startAge = months[0]?.age ?? 0

  // Group months by simulation year (integer age relative to start)
  const byAge = new Map<number, MonthSnapshot[]>()
  for (const m of months) {
    const intAge = Math.floor(m.age)
    if (!byAge.has(intAge)) byAge.set(intAge, [])
    byAge.get(intAge)!.push(m)
  }

  for (const [, snapshots] of byAge) {
    const last = snapshots[snapshots.length - 1]
    const deflator = last.cumulativeInflation

    if (isCoupleMode) {
      // Couple mode: extract partner data from HouseholdMonthSnapshot
      const householdLast = last as import('../engine/types').HouseholdMonthSnapshot

      // Sum monthly flows for each partner
      let partnerAContribs = 0
      let partnerATax = 0
      let partnerBContribs = 0
      let partnerBTax = 0
      let totalSpending = 0

      for (const m of snapshots) {
        const household = m as import('../engine/types').HouseholdMonthSnapshot
        partnerAContribs += household.partnerA?.contributions ?? 0
        partnerATax += household.partnerA?.taxPaid ?? 0
        partnerBContribs += household.partnerB?.contributions ?? 0
        partnerBTax += household.partnerB?.taxPaid ?? 0
        totalSpending += m.spending
      }

      const partnerAReal = householdLast.partnerA?.balancesReal
      const partnerBReal = householdLast.partnerB?.balancesReal

      const partnerAAge = Math.floor(householdLast.partnerA?.age ?? 0)
      const simulationYear = partnerAAge - Math.floor(startAge)

      data.push({
        simulationYear,
        partnerA: {
          age: partnerAAge,
          salary: Math.round((householdLast.partnerA?.salary ?? 0) / deflator),
          contributions: Math.round(partnerAContribs / deflator),
          taxPaid: Math.round(partnerATax / deflator),
          sippBalance: partnerAReal
            ? Math.round(partnerAReal.sipp.equities + partnerAReal.sipp.bonds)
            : 0,
          isaBalance: partnerAReal
            ? Math.round(partnerAReal.ssISA.equities + partnerAReal.ssISA.bonds + partnerAReal.cashISA)
            : 0,
          cashBalance: partnerAReal ? Math.round(partnerAReal.cashSavings) : 0,
        },
        partnerB: householdLast.partnerB && partnerBReal
          ? {
              age: Math.floor(householdLast.partnerB.age),
              salary: Math.round(householdLast.partnerB.salary / deflator),
              contributions: Math.round(partnerBContribs / deflator),
              taxPaid: Math.round(partnerBTax / deflator),
              sippBalance: Math.round(
                partnerBReal.sipp.equities + partnerBReal.sipp.bonds
              ),
              isaBalance: Math.round(
                partnerBReal.ssISA.equities +
                  partnerBReal.ssISA.bonds +
                  partnerBReal.cashISA
              ),
              cashBalance: Math.round(partnerBReal.cashSavings),
            }
          : undefined,
        spending: Math.round(totalSpending / deflator),
        totalNetWorth: Math.round(last.totalReal),
      })
    } else {
      // Single mode: map person data to partnerA
      let totalContributions = 0
      let totalSpending = 0
      let totalTax = 0
      for (const m of snapshots) {
        totalContributions += m.contributions
        totalSpending += m.spending
        totalTax += m.taxPaid
      }

      const real = last.balancesReal
      const partnerAAge = Math.floor(last.age)
      const simulationYear = partnerAAge - Math.floor(startAge)

      data.push({
        simulationYear,
        partnerA: {
          age: partnerAAge,
          salary: Math.round(last.salary / deflator),
          contributions: Math.round(totalContributions / deflator),
          taxPaid: Math.round(totalTax / deflator),
          sippBalance: Math.round(real.sipp.equities + real.sipp.bonds),
          isaBalance: Math.round(real.ssISA.equities + real.ssISA.bonds + real.cashISA),
          cashBalance: Math.round(real.cashSavings),
        },
        spending: Math.round(totalSpending / deflator),
        totalNetWorth: Math.round(last.totalReal),
      })
    }
  }

  return data
}

export function computeSummary(data: YearProjection[], inputs: Inputs) {
  // Get retirement age based on mode
  const retirementAge =
    inputs.householdType === 'single'
      ? inputs.retirementAge
      : Math.min(inputs.partnerA.retirementAge, inputs.partnerB.retirementAge)

  const retirementRow = data.find(d => d.partnerA.age === retirementAge)
  const totalAtRetirement = retirementRow?.totalNetWorth ?? 0

  const runsOutRow = data.find(d => d.partnerA.age >= retirementAge && d.totalNetWorth <= 0)
  const runsOutAge = runsOutRow?.partnerA.age ?? null

  const yearsFunded = runsOutAge
    ? runsOutAge - retirementAge
    : inputs.longevity - retirementAge

  const outcome = runsOutAge
    ? `Shortfall from age ${runsOutAge}`
    : `Money lasts to age ${inputs.longevity}`

  const status: 'green' | 'amber' | 'red' = runsOutAge
    ? runsOutAge - retirementAge < 20 ? 'red' : 'amber'
    : 'green'

  return { totalAtRetirement, yearsFunded, outcome, status, retirementAge }
}
