/**
 * State pension income.
 *
 * Annual amount in today's money, grown by inflation, paid monthly.
 * Starts at state pension age and reduces the drawdown need.
 */

/**
 * Compute monthly state pension income (nominal) for a given month.
 *
 * @param age - current age
 * @param statePensionAge - age at which state pension starts
 * @param annualAmountTodaysMoney - annual state pension in today's money
 * @param cumulativeInflation - cumulative inflation factor
 * @returns monthly state pension in nominal terms (0 if not yet eligible)
 */
export function computeMonthlyStatePension(
  age: number,
  statePensionAge: number,
  annualAmountTodaysMoney: number,
  cumulativeInflation: number,
): number {
  if (age < statePensionAge) return 0
  return (annualAmountTodaysMoney / 12) * cumulativeInflation
}

/**
 * Compute the annual state pension in nominal terms for a given year.
 * Used for marginal rate estimation at the start of a tax year.
 */
export function annualStatePensionNominal(
  annualAmountTodaysMoney: number,
  cumulativeInflation: number,
): number {
  return annualAmountTodaysMoney * cumulativeInflation
}
