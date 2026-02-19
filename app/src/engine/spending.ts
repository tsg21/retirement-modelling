/**
 * Monthly spending computation.
 *
 * - Base annual spending in today's money, grown by cumulative inflation
 * - Step-downs: at specified ages, replace the spending level
 * - One-off expenses: added in the month they occur
 */

import type { SpendingStepDown, OneOffExpense } from '@/types'

/**
 * Get the current annual spending level in today's money,
 * accounting for any step-downs at this age.
 */
export function getBaseSpending(
  annualSpending: number,
  stepDowns: SpendingStepDown[],
  age: number,
): number {
  // Step-downs are sorted by age. Find the last one that applies.
  let spending = annualSpending
  for (const stepDown of stepDowns) {
    if (age >= stepDown.age) {
      spending = stepDown.amount
    }
  }
  return spending
}

/**
 * Compute the total spending need for a given month (in nominal terms).
 *
 * @param annualSpending - annual spending in today's money
 * @param stepDowns - spending step-downs (sorted by age)
 * @param oneOffExpenses - one-off expenses
 * @param age - current age (fractional)
 * @param currentYear - calendar year of this month (for matching one-off expenses)
 * @param cumulativeInflation - cumulative inflation factor from simulation start
 * @param isRetired - whether the person is retired this month
 * @returns monthly spending in nominal terms
 */
export function computeMonthlySpending(
  annualSpending: number,
  stepDowns: SpendingStepDown[],
  oneOffExpenses: OneOffExpense[],
  age: number,
  currentYear: number,
  cumulativeInflation: number,
  isRetired: boolean,
): { regularSpending: number; oneOffAmount: number } {
  // Regular spending only applies post-retirement
  let regularSpending = 0
  if (isRetired) {
    const baseAnnual = getBaseSpending(annualSpending, stepDowns, age)
    regularSpending = (baseAnnual / 12) * cumulativeInflation
  }

  // One-off expenses: match by year, spread across 12 months → actually, add in first month of that year
  // Per PRD: one-off expenses are added in the month they occur (by year).
  // We add the full amount in the first month of that year (when age matches the start of that year).
  let oneOffAmount = 0
  for (const expense of oneOffExpenses) {
    if (expense.year === currentYear) {
      // Add full amount in January (first month of the year)
      // We check if this is the first month of the calendar year
      oneOffAmount += expense.amount * cumulativeInflation
    }
  }

  return { regularSpending, oneOffAmount }
}
