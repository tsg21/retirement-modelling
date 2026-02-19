import { describe, it, expect } from 'vitest'
import { getBaseSpending, computeMonthlySpending } from './spending'

describe('getBaseSpending', () => {
  it('returns base spending when no step-downs', () => {
    expect(getBaseSpending(30_000, [], 65)).toBe(30_000)
  })

  it('applies step-down at the right age', () => {
    const stepDowns = [{ age: 80, amount: 25_000 }]
    expect(getBaseSpending(30_000, stepDowns, 79)).toBe(30_000)
    expect(getBaseSpending(30_000, stepDowns, 80)).toBe(25_000)
    expect(getBaseSpending(30_000, stepDowns, 85)).toBe(25_000)
  })

  it('applies multiple step-downs in order', () => {
    const stepDowns = [
      { age: 75, amount: 28_000 },
      { age: 85, amount: 22_000 },
    ]
    expect(getBaseSpending(30_000, stepDowns, 74)).toBe(30_000)
    expect(getBaseSpending(30_000, stepDowns, 75)).toBe(28_000)
    expect(getBaseSpending(30_000, stepDowns, 84)).toBe(28_000)
    expect(getBaseSpending(30_000, stepDowns, 85)).toBe(22_000)
  })
})

describe('computeMonthlySpending', () => {
  it('returns 0 regular spending when pre-retirement', () => {
    const { regularSpending } = computeMonthlySpending(
      30_000, [], [], 50, 2030, 1.0, false,
    )
    expect(regularSpending).toBe(0)
  })

  it('returns correct monthly spending when retired', () => {
    const { regularSpending } = computeMonthlySpending(
      30_000, [], [], 65, 2040, 1.0, true,
    )
    expect(regularSpending).toBeCloseTo(30_000 / 12)
  })

  it('inflates spending by cumulative inflation', () => {
    const { regularSpending } = computeMonthlySpending(
      30_000, [], [], 65, 2040, 1.10, true,
    )
    expect(regularSpending).toBeCloseTo((30_000 / 12) * 1.10)
  })

  it('applies step-down in retirement', () => {
    const stepDowns = [{ age: 80, amount: 20_000 }]
    const { regularSpending } = computeMonthlySpending(
      30_000, stepDowns, [], 80, 2055, 1.0, true,
    )
    expect(regularSpending).toBeCloseTo(20_000 / 12)
  })

  it('adds one-off expense in the matching year', () => {
    const oneOffs = [{ year: 2040, amount: 12_000 }]
    const { oneOffAmount } = computeMonthlySpending(
      30_000, [], oneOffs, 65, 2040, 1.0, true,
    )
    expect(oneOffAmount).toBeCloseTo(12_000)
  })

  it('one-off expense is inflated', () => {
    const oneOffs = [{ year: 2040, amount: 12_000 }]
    const { oneOffAmount } = computeMonthlySpending(
      30_000, [], oneOffs, 65, 2040, 1.20, true,
    )
    expect(oneOffAmount).toBeCloseTo(12_000 * 1.20)
  })

  it('no one-off expense in non-matching year', () => {
    const oneOffs = [{ year: 2040, amount: 12_000 }]
    const { oneOffAmount } = computeMonthlySpending(
      30_000, [], oneOffs, 65, 2041, 1.0, true,
    )
    expect(oneOffAmount).toBe(0)
  })
})
