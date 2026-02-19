/**
 * Cumulative inflation tracking and nominal → real value conversion.
 */

import type { AccountBalances } from './types'

/**
 * Advance cumulative inflation by one month.
 * Monthly inflation rate = (1 + annualRate)^(1/12) - 1
 */
export function advanceInflation(cumulativeInflation: number, annualInflationRate: number): number {
  const monthlyRate = Math.pow(1 + annualInflationRate, 1 / 12) - 1
  return cumulativeInflation * (1 + monthlyRate)
}

/**
 * Deflate a nominal value to real (today's money).
 * realValue = nominalValue / cumulativeInflation
 */
export function toRealValue(nominalValue: number, cumulativeInflation: number): number {
  return nominalValue / cumulativeInflation
}

/**
 * Inflate a today's-money value to nominal at a given cumulative inflation.
 * nominalValue = realValue * cumulativeInflation
 */
export function toNominalValue(realValue: number, cumulativeInflation: number): number {
  return realValue * cumulativeInflation
}

/** Convert all account balances from nominal to real */
export function balancesToReal(
  nominal: AccountBalances,
  cumulativeInflation: number,
): AccountBalances {
  return {
    sipp: {
      equities: toRealValue(nominal.sipp.equities, cumulativeInflation),
      bonds: toRealValue(nominal.sipp.bonds, cumulativeInflation),
    },
    ssISA: {
      equities: toRealValue(nominal.ssISA.equities, cumulativeInflation),
      bonds: toRealValue(nominal.ssISA.bonds, cumulativeInflation),
    },
    cashISA: toRealValue(nominal.cashISA, cumulativeInflation),
    cashSavings: toRealValue(nominal.cashSavings, cumulativeInflation),
  }
}
