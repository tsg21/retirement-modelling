/**
 * Employee Class 1 National Insurance computation.
 *
 * Salary sacrifice reduces NI-able pay.
 * Used for contribution limit validation (pre-retirement take-home is not tracked).
 */

/** NI thresholds (2024/25 annual values) */
export const NI_PRIMARY_THRESHOLD = 12_570   // annual
export const NI_UPPER_EARNINGS_LIMIT = 50_270 // annual
export const NI_RATE_MAIN = 0.08  // 8% between PT and UEL (2024/25)
export const NI_RATE_ABOVE_UEL = 0.02 // 2% above UEL

/**
 * Compute annual employee NI on a given annual salary.
 * Salary sacrifice pension contributions should be subtracted from salary
 * before calling this function (they reduce NI-able pay).
 */
export function computeAnnualNI(annualSalary: number): number {
  if (annualSalary <= NI_PRIMARY_THRESHOLD) return 0

  let ni = 0

  // Main rate: 8% between primary threshold and upper earnings limit
  const mainBand = Math.min(annualSalary, NI_UPPER_EARNINGS_LIMIT) - NI_PRIMARY_THRESHOLD
  ni += mainBand * NI_RATE_MAIN

  // Above UEL: 2%
  if (annualSalary > NI_UPPER_EARNINGS_LIMIT) {
    ni += (annualSalary - NI_UPPER_EARNINGS_LIMIT) * NI_RATE_ABOVE_UEL
  }

  return ni
}

/**
 * Compute annual employee NI with salary sacrifice pension contribution.
 * The employee pension contribution is subtracted from gross salary before NI.
 */
export function computeAnnualNIWithSalarySacrifice(
  grossSalary: number,
  employeePensionContribution: number,
): number {
  const niablePay = grossSalary - employeePensionContribution
  return computeAnnualNI(niablePay)
}
