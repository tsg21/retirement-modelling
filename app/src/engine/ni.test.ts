import { describe, it, expect } from 'vitest'
import {
  computeAnnualNI,
  computeAnnualNIWithSalarySacrifice,
  NI_PRIMARY_THRESHOLD,
  NI_UPPER_EARNINGS_LIMIT,
} from './ni'

describe('computeAnnualNI', () => {
  it('returns 0 for income at or below primary threshold', () => {
    expect(computeAnnualNI(NI_PRIMARY_THRESHOLD)).toBe(0)
    expect(computeAnnualNI(10_000)).toBe(0)
    expect(computeAnnualNI(0)).toBe(0)
  })

  it('computes NI between PT and UEL at 8%', () => {
    const salary = 30_000
    const expected = (salary - NI_PRIMARY_THRESHOLD) * 0.08
    expect(computeAnnualNI(salary)).toBeCloseTo(expected)
  })

  it('computes NI at upper earnings limit', () => {
    const expected = (NI_UPPER_EARNINGS_LIMIT - NI_PRIMARY_THRESHOLD) * 0.08
    expect(computeAnnualNI(NI_UPPER_EARNINGS_LIMIT)).toBeCloseTo(expected)
  })

  it('computes NI above UEL at 2%', () => {
    const salary = 65_000
    const mainBand = (NI_UPPER_EARNINGS_LIMIT - NI_PRIMARY_THRESHOLD) * 0.08
    const aboveUEL = (salary - NI_UPPER_EARNINGS_LIMIT) * 0.02
    expect(computeAnnualNI(salary)).toBeCloseTo(mainBand + aboveUEL)
  })
})

describe('computeAnnualNIWithSalarySacrifice', () => {
  it('salary sacrifice reduces NI-able pay', () => {
    const salary = 65_000
    const employeeContribution = 6_500 // 10% of salary

    const niWithout = computeAnnualNI(salary)
    const niWith = computeAnnualNIWithSalarySacrifice(salary, employeeContribution)

    // NI should be lower with salary sacrifice
    expect(niWith).toBeLessThan(niWithout)

    // Should equal NI on reduced salary
    expect(niWith).toBeCloseTo(computeAnnualNI(salary - employeeContribution))
  })

  it('large sacrifice can bring salary below PT, resulting in zero NI', () => {
    const salary = 15_000
    const contribution = 5_000
    const ni = computeAnnualNIWithSalarySacrifice(salary, contribution)
    // £15k - £5k = £10k, below PT of £12,570
    expect(ni).toBe(0)
  })
})
