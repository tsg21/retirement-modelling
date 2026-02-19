/**
 * UK income tax computation.
 *
 * Bands are current 2024/25 values and grow with inflation each year.
 * Monthly tax uses 1/12 of annual bands.
 */

export interface TaxBands {
  personalAllowance: number
  basicRateLimit: number   // upper limit of basic rate band (cumulative)
  higherRateLimit: number  // upper limit of higher rate band (cumulative)
}

/** Current (base-year) UK tax bands */
export const BASE_TAX_BANDS: TaxBands = {
  personalAllowance: 12_570,
  basicRateLimit: 50_270,
  higherRateLimit: 125_140,
}

/** Scale tax bands by a cumulative inflation factor */
export function inflateBands(bands: TaxBands, cumulativeInflation: number): TaxBands {
  return {
    personalAllowance: bands.personalAllowance * cumulativeInflation,
    basicRateLimit: bands.basicRateLimit * cumulativeInflation,
    higherRateLimit: bands.higherRateLimit * cumulativeInflation,
  }
}

/**
 * Compute annual income tax given annual taxable income and (possibly inflated) bands.
 *
 * Rates: 0% up to personal allowance, 20% basic, 40% higher, 45% additional.
 */
export function computeAnnualTax(annualIncome: number, bands: TaxBands): number {
  if (annualIncome <= 0) return 0

  let tax = 0
  let remaining = annualIncome

  // Personal allowance (0%)
  const paUsed = Math.min(remaining, bands.personalAllowance)
  remaining -= paUsed

  // Basic rate (20%)
  const basicBand = bands.basicRateLimit - bands.personalAllowance
  const basicUsed = Math.min(remaining, basicBand)
  tax += basicUsed * 0.20
  remaining -= basicUsed

  // Higher rate (40%)
  const higherBand = bands.higherRateLimit - bands.basicRateLimit
  const higherUsed = Math.min(remaining, higherBand)
  tax += higherUsed * 0.40
  remaining -= higherUsed

  // Additional rate (45%)
  if (remaining > 0) {
    tax += remaining * 0.45
  }

  return tax
}

/**
 * Compute monthly tax using 1/12 of annual bands.
 * This is equivalent to: annualTax(monthlyIncome * 12, bands) / 12
 * but computed directly on monthly figures for convenience.
 */
export function computeMonthlyTax(monthlyIncome: number, bands: TaxBands): number {
  const annualised = monthlyIncome * 12
  return computeAnnualTax(annualised, bands) / 12
}

/**
 * Determine the marginal tax rate for the next pound of income above a given
 * annual income level. Used for SIPP gross-up estimation.
 */
export function marginalRate(annualIncome: number, bands: TaxBands): number {
  if (annualIncome < 0) return 0
  if (annualIncome < bands.personalAllowance) return 0
  if (annualIncome < bands.basicRateLimit) return 0.20
  if (annualIncome < bands.higherRateLimit) return 0.40
  return 0.45
}
