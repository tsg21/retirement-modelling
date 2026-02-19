/**
 * Post-retirement drawdown logic.
 *
 * Depletes accounts in user-specified order to meet monthly spending needs.
 * - Cash: Cash Savings first, then Cash ISA
 * - ISA: S&S ISA (pro-rata from equities and bonds)
 * - SIPP: grossed up to cover tax (25% tax-free, 75% taxable at marginal rate)
 *
 * Accounts cannot go below zero; if a category is exhausted, move to the next.
 */

import type { AccountBalances, WrapperBalance } from './types'
import type { DrawdownCategory } from '@/types'

export interface DrawdownResult {
  /** Updated account balances after drawdown */
  newBalances: AccountBalances
  /** Tax paid on SIPP withdrawals this month */
  taxPaid: number
  /** Actual spending met (may be less than requested if all accounts exhausted) */
  spendingMet: number
}

/**
 * Withdraw from a wrapper (SIPP or S&S ISA) pro-rata from equities and bonds.
 * Returns the updated wrapper and the amount actually withdrawn.
 */
function withdrawFromWrapper(
  wrapper: WrapperBalance,
  amount: number,
): { newWrapper: WrapperBalance; withdrawn: number } {
  const total = wrapper.equities + wrapper.bonds
  if (total <= 0 || amount <= 0) {
    return { newWrapper: { ...wrapper }, withdrawn: 0 }
  }

  const actualWithdraw = Math.min(amount, total)
  const equityFraction = wrapper.equities / total
  const bondFraction = wrapper.bonds / total

  return {
    newWrapper: {
      equities: wrapper.equities - actualWithdraw * equityFraction,
      bonds: wrapper.bonds - actualWithdraw * bondFraction,
    },
    withdrawn: actualWithdraw,
  }
}

/**
 * Draw from Cash category: Cash Savings first, then Cash ISA.
 */
function drawCash(
  balances: AccountBalances,
  amount: number,
): { newBalances: AccountBalances; drawn: number } {
  let remaining = amount
  let cashSavings = balances.cashSavings
  let cashISA = balances.cashISA

  // Cash Savings first
  const fromSavings = Math.min(remaining, cashSavings)
  cashSavings -= fromSavings
  remaining -= fromSavings

  // Then Cash ISA
  const fromCashISA = Math.min(remaining, cashISA)
  cashISA -= fromCashISA
  remaining -= fromCashISA

  return {
    newBalances: {
      ...balances,
      cashSavings,
      cashISA,
    },
    drawn: amount - remaining,
  }
}

/**
 * Draw from ISA category: S&S ISA, pro-rata equities/bonds.
 */
function drawISA(
  balances: AccountBalances,
  amount: number,
): { newBalances: AccountBalances; drawn: number } {
  const { newWrapper, withdrawn } = withdrawFromWrapper(balances.ssISA, amount)
  return {
    newBalances: {
      ...balances,
      ssISA: newWrapper,
    },
    drawn: withdrawn,
  }
}

/**
 * Draw from SIPP category with tax gross-up.
 *
 * Each withdrawal is 25% tax-free and 75% taxable at the estimated marginal rate.
 * grossDrawdown = spendingNeed / (1 - marginalRate * 0.75)
 *
 * The user receives `spendingNeed`, and `grossDrawdown - spendingNeed` is tax.
 */
function drawSIPP(
  balances: AccountBalances,
  amount: number,
  marginalRate: number,
): { newBalances: AccountBalances; drawn: number; taxPaid: number } {
  if (amount <= 0) {
    return { newBalances: { ...balances }, drawn: 0, taxPaid: 0 }
  }

  // Gross up the spending need to cover tax
  const grossUpFactor = 1 / (1 - marginalRate * 0.75)
  const grossNeeded = amount * grossUpFactor

  const sippTotal = balances.sipp.equities + balances.sipp.bonds

  if (sippTotal <= 0) {
    return { newBalances: { ...balances }, drawn: 0, taxPaid: 0 }
  }

  // Can we cover the full gross amount?
  const grossWithdrawn = Math.min(grossNeeded, sippTotal)
  const { newWrapper } = withdrawFromWrapper(balances.sipp, grossWithdrawn)

  // How much spending does this cover?
  const netReceived = grossWithdrawn / grossUpFactor
  const tax = grossWithdrawn - netReceived

  return {
    newBalances: {
      ...balances,
      sipp: newWrapper,
    },
    drawn: netReceived,
    taxPaid: tax,
  }
}

/**
 * Execute drawdown to meet a monthly spending need.
 *
 * Processes categories in the specified order. Each category is depleted
 * before moving to the next. Returns updated balances and tax paid.
 */
export function executeDrawdown(
  balances: AccountBalances,
  spendingNeed: number,
  drawdownOrder: DrawdownCategory[],
  marginalRate: number,
): DrawdownResult {
  let currentBalances = { ...balances }
  // Deep copy wrapper objects
  currentBalances.sipp = { ...balances.sipp }
  currentBalances.ssISA = { ...balances.ssISA }

  let remaining = spendingNeed
  let totalTaxPaid = 0

  for (const category of drawdownOrder) {
    if (remaining <= 0) break

    switch (category) {
      case 'Cash': {
        const result = drawCash(currentBalances, remaining)
        currentBalances = result.newBalances
        remaining -= result.drawn
        break
      }
      case 'ISA': {
        const result = drawISA(currentBalances, remaining)
        currentBalances = result.newBalances
        remaining -= result.drawn
        break
      }
      case 'SIPP': {
        const result = drawSIPP(currentBalances, remaining, marginalRate)
        currentBalances = result.newBalances
        remaining -= result.drawn
        totalTaxPaid += result.taxPaid
        break
      }
    }
  }

  return {
    newBalances: currentBalances,
    taxPaid: totalTaxPaid,
    spendingMet: spendingNeed - remaining,
  }
}
