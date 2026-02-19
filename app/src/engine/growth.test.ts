import { describe, it, expect } from 'vitest'
import {
  annualToMonthly,
  growWrapper,
  growCash,
  applyMonthlyGrowth,
  totalBalance,
} from './growth'
import type { AccountBalances } from './types'

describe('annualToMonthly', () => {
  it('converts 6% annual to correct monthly rate', () => {
    const monthly = annualToMonthly(0.06)
    // 12 months of compounding should give ~6%
    const annual = Math.pow(1 + monthly, 12) - 1
    expect(annual).toBeCloseTo(0.06, 10)
  })

  it('0% annual gives 0% monthly', () => {
    expect(annualToMonthly(0)).toBe(0)
  })
})

describe('growWrapper', () => {
  it('grows equities and bonds at different rates', () => {
    const wrapper = { equities: 70_000, bonds: 30_000 }
    const result = growWrapper(wrapper, 0.005, 0.003)
    expect(result.equities).toBeCloseTo(70_000 * 1.005)
    expect(result.bonds).toBeCloseTo(30_000 * 1.003)
  })
})

describe('growCash', () => {
  it('grows cash at the cash rate', () => {
    expect(growCash(10_000, 0.003)).toBeCloseTo(10_000 * 1.003)
  })
})

describe('applyMonthlyGrowth', () => {
  it('applies growth to all accounts and reports total growth', () => {
    const balances: AccountBalances = {
      sipp: { equities: 100_000, bonds: 50_000 },
      ssISA: { equities: 40_000, bonds: 10_000 },
      cashISA: 10_000,
      cashSavings: 20_000,
    }

    const { newBalances, totalGrowth } = applyMonthlyGrowth(balances, {
      equityRate: 0.06,
      bondRate: 0.04,
      cashRate: 0.04,
    })

    // All balances should be higher
    expect(newBalances.sipp.equities).toBeGreaterThan(100_000)
    expect(newBalances.sipp.bonds).toBeGreaterThan(50_000)
    expect(newBalances.ssISA.equities).toBeGreaterThan(40_000)
    expect(newBalances.cashISA).toBeGreaterThan(10_000)
    expect(newBalances.cashSavings).toBeGreaterThan(20_000)
    expect(totalGrowth).toBeGreaterThan(0)

    // Growth should equal the difference
    const oldTotal = totalBalance(balances)
    const newTotal = totalBalance(newBalances)
    expect(totalGrowth).toBeCloseTo(newTotal - oldTotal)
  })

  it('12 months of equity growth matches annual rate', () => {
    const balances: AccountBalances = {
      sipp: { equities: 100_000, bonds: 0 },
      ssISA: { equities: 0, bonds: 0 },
      cashISA: 0,
      cashSavings: 0,
    }

    let current = balances
    for (let i = 0; i < 12; i++) {
      const { newBalances } = applyMonthlyGrowth(current, {
        equityRate: 0.06,
        bondRate: 0,
        cashRate: 0,
      })
      current = newBalances
    }

    expect(current.sipp.equities).toBeCloseTo(100_000 * 1.06, 0)
  })
})

describe('totalBalance', () => {
  it('sums all account balances', () => {
    const b: AccountBalances = {
      sipp: { equities: 100, bonds: 50 },
      ssISA: { equities: 40, bonds: 10 },
      cashISA: 10,
      cashSavings: 20,
    }
    expect(totalBalance(b)).toBe(230)
  })
})
