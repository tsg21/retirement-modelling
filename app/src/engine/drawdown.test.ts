import { describe, it, expect } from 'vitest'
import { executeDrawdown } from './drawdown'
import type { AccountBalances } from './types'

function makeBalances(overrides: Partial<AccountBalances> = {}): AccountBalances {
  return {
    sipp: { equities: 100_000, bonds: 50_000 },
    ssISA: { equities: 40_000, bonds: 10_000 },
    cashISA: 10_000,
    cashSavings: 20_000,
    ...overrides,
  }
}

describe('executeDrawdown', () => {
  describe('Cash → ISA → SIPP order', () => {
    const order = ['Cash', 'ISA', 'SIPP'] as const

    it('draws from cash savings first', () => {
      const balances = makeBalances()
      const result = executeDrawdown(balances, 5_000, [...order], 0.20)
      expect(result.newBalances.cashSavings).toBeCloseTo(15_000)
      expect(result.newBalances.cashISA).toBe(10_000)
      expect(result.spendingMet).toBeCloseTo(5_000)
      expect(result.taxPaid).toBe(0)
    })

    it('overflows from cash savings to cash ISA', () => {
      const balances = makeBalances()
      const result = executeDrawdown(balances, 25_000, [...order], 0.20)
      expect(result.newBalances.cashSavings).toBe(0)
      expect(result.newBalances.cashISA).toBeCloseTo(5_000)
      expect(result.spendingMet).toBeCloseTo(25_000)
    })

    it('overflows from cash to ISA', () => {
      const balances = makeBalances()
      // Need £40k: £20k cash savings + £10k cash ISA + £10k from S&S ISA
      const result = executeDrawdown(balances, 40_000, [...order], 0.20)
      expect(result.newBalances.cashSavings).toBe(0)
      expect(result.newBalances.cashISA).toBe(0)
      // £10k drawn from S&S ISA (total was £50k)
      const ssISARemaining = result.newBalances.ssISA.equities + result.newBalances.ssISA.bonds
      expect(ssISARemaining).toBeCloseTo(40_000)
      expect(result.spendingMet).toBeCloseTo(40_000)
    })

    it('draws from SIPP with tax gross-up', () => {
      const balances = makeBalances({
        cashSavings: 0,
        cashISA: 0,
        ssISA: { equities: 0, bonds: 0 },
      })
      // At 20% marginal rate, gross-up factor = 1 / (1 - 0.20 * 0.75) = 1 / 0.85
      const result = executeDrawdown(balances, 10_000, [...order], 0.20)
      const grossFactor = 1 / (1 - 0.20 * 0.75)
      const expectedGross = 10_000 * grossFactor
      const expectedTax = expectedGross - 10_000
      expect(result.taxPaid).toBeCloseTo(expectedTax)
      expect(result.spendingMet).toBeCloseTo(10_000)
      // SIPP should be reduced by the gross amount
      const sippRemaining = result.newBalances.sipp.equities + result.newBalances.sipp.bonds
      expect(sippRemaining).toBeCloseTo(150_000 - expectedGross)
    })
  })

  describe('SIPP first order', () => {
    it('draws from SIPP before other accounts', () => {
      const balances = makeBalances()
      const result = executeDrawdown(balances, 5_000, ['SIPP', 'ISA', 'Cash'], 0.20)
      // Cash and ISA should be untouched
      expect(result.newBalances.cashSavings).toBe(20_000)
      expect(result.newBalances.cashISA).toBe(10_000)
      expect(result.taxPaid).toBeGreaterThan(0)
      expect(result.spendingMet).toBeCloseTo(5_000)
    })
  })

  describe('pro-rata withdrawal from wrapper', () => {
    it('withdraws pro-rata from equities and bonds in S&S ISA', () => {
      const balances = makeBalances({ cashSavings: 0, cashISA: 0 })
      // S&S ISA has 40k equities + 10k bonds (80/20 split)
      const result = executeDrawdown(balances, 10_000, ['Cash', 'ISA', 'SIPP'], 0.20)
      // 80% from equities, 20% from bonds
      expect(result.newBalances.ssISA.equities).toBeCloseTo(40_000 - 8_000)
      expect(result.newBalances.ssISA.bonds).toBeCloseTo(10_000 - 2_000)
    })
  })

  describe('account exhaustion', () => {
    it('handles all accounts exhausted', () => {
      const balances = makeBalances({
        sipp: { equities: 0, bonds: 0 },
        ssISA: { equities: 0, bonds: 0 },
        cashISA: 0,
        cashSavings: 1_000,
      })
      const result = executeDrawdown(balances, 5_000, ['Cash', 'ISA', 'SIPP'], 0.20)
      expect(result.spendingMet).toBeCloseTo(1_000)
      expect(result.newBalances.cashSavings).toBe(0)
    })

    it('returns 0 spending met when all accounts are empty', () => {
      const balances = makeBalances({
        sipp: { equities: 0, bonds: 0 },
        ssISA: { equities: 0, bonds: 0 },
        cashISA: 0,
        cashSavings: 0,
      })
      const result = executeDrawdown(balances, 5_000, ['Cash', 'ISA', 'SIPP'], 0.20)
      expect(result.spendingMet).toBe(0)
    })
  })

  describe('SIPP gross-up at different marginal rates', () => {
    it('0% marginal rate means no tax', () => {
      const balances = makeBalances({
        cashSavings: 0, cashISA: 0,
        ssISA: { equities: 0, bonds: 0 },
      })
      const result = executeDrawdown(balances, 10_000, ['Cash', 'ISA', 'SIPP'], 0)
      expect(result.taxPaid).toBe(0)
      expect(result.spendingMet).toBeCloseTo(10_000)
      const sippRemaining = result.newBalances.sipp.equities + result.newBalances.sipp.bonds
      expect(sippRemaining).toBeCloseTo(140_000)
    })

    it('40% marginal rate means more tax', () => {
      const balances = makeBalances({
        cashSavings: 0, cashISA: 0,
        ssISA: { equities: 0, bonds: 0 },
      })
      const result20 = executeDrawdown(balances, 10_000, ['Cash', 'ISA', 'SIPP'], 0.20)
      const result40 = executeDrawdown(balances, 10_000, ['Cash', 'ISA', 'SIPP'], 0.40)
      expect(result40.taxPaid).toBeGreaterThan(result20.taxPaid)
    })
  })
})
