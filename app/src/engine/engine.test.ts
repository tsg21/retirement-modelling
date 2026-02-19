import { describe, it, expect } from 'vitest'
import type { AccountBalances } from './types'

describe('engine setup', () => {
  it('types are importable', () => {
    const balances: AccountBalances = {
      sipp: { equities: 100_000, bonds: 50_000 },
      ssISA: { equities: 40_000, bonds: 10_000 },
      cashISA: 10_000,
      cashSavings: 20_000,
    }
    expect(balances.sipp.equities + balances.sipp.bonds).toBe(150_000)
  })
})
