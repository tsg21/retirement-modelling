import { describe, it, expect } from 'vitest'
import { advanceInflation, toRealValue, toNominalValue, balancesToReal } from './inflation'
import type { AccountBalances } from './types'

describe('advanceInflation', () => {
  it('compounds monthly from 1.0', () => {
    let cumulative = 1.0
    for (let i = 0; i < 12; i++) {
      cumulative = advanceInflation(cumulative, 0.02)
    }
    // After 12 months at 2% annual, should be ~1.02
    expect(cumulative).toBeCloseTo(1.02, 6)
  })

  it('returns 1.0 for 0% inflation after one month', () => {
    const result = advanceInflation(1.0, 0)
    expect(result).toBe(1.0)
  })

  it('compounds over multiple years', () => {
    let cumulative = 1.0
    for (let i = 0; i < 120; i++) { // 10 years
      cumulative = advanceInflation(cumulative, 0.02)
    }
    expect(cumulative).toBeCloseTo(Math.pow(1.02, 10), 4)
  })
})

describe('toRealValue', () => {
  it('deflates nominal value by cumulative inflation', () => {
    // £102 after 2% inflation = £100 in today's money
    expect(toRealValue(102, 1.02)).toBeCloseTo(100, 2)
  })

  it('returns nominal value when cumulative inflation is 1.0', () => {
    expect(toRealValue(50_000, 1.0)).toBe(50_000)
  })
})

describe('toNominalValue', () => {
  it('inflates today\'s money to nominal', () => {
    expect(toNominalValue(100, 1.02)).toBeCloseTo(102, 2)
  })

  it('is the inverse of toRealValue', () => {
    const nominal = 50_000
    const inflation = 1.15
    const real = toRealValue(nominal, inflation)
    expect(toNominalValue(real, inflation)).toBeCloseTo(nominal, 4)
  })
})

describe('balancesToReal', () => {
  it('deflates all account balances', () => {
    const nominal: AccountBalances = {
      sipp: { equities: 102_000, bonds: 51_000 },
      ssISA: { equities: 40_800, bonds: 10_200 },
      cashISA: 10_200,
      cashSavings: 20_400,
    }

    const real = balancesToReal(nominal, 1.02)

    expect(real.sipp.equities).toBeCloseTo(100_000, 0)
    expect(real.sipp.bonds).toBeCloseTo(50_000, 0)
    expect(real.ssISA.equities).toBeCloseTo(40_000, 0)
    expect(real.cashISA).toBeCloseTo(10_000, 0)
    expect(real.cashSavings).toBeCloseTo(20_000, 0)
  })
})
