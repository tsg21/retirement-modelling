import { describe, it, expect } from 'vitest'
import { computeMonthlyStatePension, annualStatePensionNominal } from './statePension'

describe('computeMonthlyStatePension', () => {
  it('returns 0 before state pension age', () => {
    expect(computeMonthlyStatePension(67, 68, 11_500, 1.0)).toBe(0)
    expect(computeMonthlyStatePension(60, 68, 11_500, 1.0)).toBe(0)
  })

  it('returns monthly amount at state pension age', () => {
    const monthly = computeMonthlyStatePension(68, 68, 11_500, 1.0)
    expect(monthly).toBeCloseTo(11_500 / 12)
  })

  it('grows with inflation', () => {
    const monthly = computeMonthlyStatePension(70, 68, 11_500, 1.20)
    expect(monthly).toBeCloseTo((11_500 / 12) * 1.20)
  })

  it('returns correct amount well after state pension age', () => {
    const monthly = computeMonthlyStatePension(85, 68, 11_500, 1.50)
    expect(monthly).toBeCloseTo((11_500 / 12) * 1.50)
  })
})

describe('annualStatePensionNominal', () => {
  it('inflates annual amount', () => {
    expect(annualStatePensionNominal(11_500, 1.10)).toBeCloseTo(11_500 * 1.10)
  })

  it('returns today\'s money value when inflation is 1.0', () => {
    expect(annualStatePensionNominal(11_500, 1.0)).toBe(11_500)
  })
})
