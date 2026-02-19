import { describe, it, expect } from 'vitest'
import {
  computeAnnualTax,
  computeMonthlyTax,
  marginalRate,
  inflateBands,
  BASE_TAX_BANDS,
} from './tax'

describe('computeAnnualTax', () => {
  const bands = BASE_TAX_BANDS

  it('returns 0 for income within personal allowance', () => {
    expect(computeAnnualTax(12_570, bands)).toBe(0)
    expect(computeAnnualTax(10_000, bands)).toBe(0)
    expect(computeAnnualTax(0, bands)).toBe(0)
  })

  it('returns 0 for negative income', () => {
    expect(computeAnnualTax(-5000, bands)).toBe(0)
  })

  it('computes basic rate tax correctly', () => {
    // £20,000 income: £12,570 PA + £7,430 at 20%
    expect(computeAnnualTax(20_000, bands)).toBeCloseTo(7_430 * 0.20)
  })

  it('computes tax at the top of basic rate band', () => {
    // £50,270: £12,570 PA + £37,700 at 20%
    expect(computeAnnualTax(50_270, bands)).toBeCloseTo(37_700 * 0.20)
  })

  it('computes higher rate tax correctly', () => {
    // £60,000: PA + £37,700 at 20% + £9,730 at 40%
    const expected = 37_700 * 0.20 + 9_730 * 0.40
    expect(computeAnnualTax(60_000, bands)).toBeCloseTo(expected)
  })

  it('computes tax at the top of higher rate band', () => {
    // £125,140: PA + £37,700 at 20% + £74,870 at 40%
    const expected = 37_700 * 0.20 + 74_870 * 0.40
    expect(computeAnnualTax(125_140, bands)).toBeCloseTo(expected)
  })

  it('computes additional rate tax correctly', () => {
    // £200,000: PA + £37,700 at 20% + £74,870 at 40% + £74,860 at 45%
    const expected = 37_700 * 0.20 + 74_870 * 0.40 + 74_860 * 0.45
    expect(computeAnnualTax(200_000, bands)).toBeCloseTo(expected)
  })
})

describe('computeMonthlyTax', () => {
  it('monthly tax × 12 equals annual tax', () => {
    const annual = computeAnnualTax(60_000, BASE_TAX_BANDS)
    const monthly = computeMonthlyTax(60_000 / 12, BASE_TAX_BANDS)
    expect(monthly * 12).toBeCloseTo(annual)
  })

  it('returns 0 for monthly income within PA/12', () => {
    expect(computeMonthlyTax(1000, BASE_TAX_BANDS)).toBe(0)
  })
})

describe('marginalRate', () => {
  const bands = BASE_TAX_BANDS

  it('returns 0 below personal allowance', () => {
    expect(marginalRate(0, bands)).toBe(0)
    expect(marginalRate(12_000, bands)).toBe(0)
  })

  it('returns 0.20 in basic rate band', () => {
    expect(marginalRate(12_570, bands)).toBe(0.20)
    expect(marginalRate(40_000, bands)).toBe(0.20)
  })

  it('returns 0.40 in higher rate band', () => {
    expect(marginalRate(50_270, bands)).toBe(0.40)
    expect(marginalRate(100_000, bands)).toBe(0.40)
  })

  it('returns 0.45 in additional rate band', () => {
    expect(marginalRate(125_140, bands)).toBe(0.45)
    expect(marginalRate(200_000, bands)).toBe(0.45)
  })
})

describe('inflateBands', () => {
  it('scales bands by cumulative inflation', () => {
    const inflated = inflateBands(BASE_TAX_BANDS, 1.10) // 10% inflation
    expect(inflated.personalAllowance).toBeCloseTo(12_570 * 1.10)
    expect(inflated.basicRateLimit).toBeCloseTo(50_270 * 1.10)
    expect(inflated.higherRateLimit).toBeCloseTo(125_140 * 1.10)
  })

  it('returns unchanged bands at 1.0 inflation', () => {
    const inflated = inflateBands(BASE_TAX_BANDS, 1.0)
    expect(inflated.personalAllowance).toBe(12_570)
  })
})
