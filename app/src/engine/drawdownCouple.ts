/**
 * Household drawdown logic for married-couple mode.
 *
 * Two-layer drawdown system:
 * 1. Wrapper category order (Cash, ISA, SIPP) - user specified
 * 2. Owner tie-break within each category (A-first, B-first, or proportional)
 *
 * Tax is computed per partner using each partner's marginal rate.
 */

import type { AccountBalances, WrapperBalance } from './types'
import type { DrawdownCategory, OwnerTieBreak } from '@/types'

/** Balances for both partners */
export interface PartnerBalances {
  a: AccountBalances
  b: AccountBalances
}

/** Result of household drawdown */
export interface HouseholdDrawdownResult {
  newBalances: PartnerBalances
  taxPaidA: number
  taxPaidB: number
  spendingMet: number
}

/**
 * Withdraw from a wrapper (SIPP or S&S ISA) pro-rata from equities and bonds.
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

/** Get total available in Cash category for one partner */
function getCashTotal(balances: AccountBalances): number {
  return balances.cashSavings + balances.cashISA
}

/** Get total available in ISA category for one partner */
function getISATotal(balances: AccountBalances): number {
  return balances.ssISA.equities + balances.ssISA.bonds
}

/** Get total available in SIPP category for one partner */
function getSIPPTotal(balances: AccountBalances): number {
  return balances.sipp.equities + balances.sipp.bonds
}

/** Get total available in a category for one partner */
function getCategoryTotal(balances: AccountBalances, category: DrawdownCategory): number {
  switch (category) {
    case 'Cash':
      return getCashTotal(balances)
    case 'ISA':
      return getISATotal(balances)
    case 'SIPP':
      return getSIPPTotal(balances)
  }
}

/**
 * Draw from Cash category (Cash Savings + Cash ISA) for one partner.
 */
function drawCashFromPartner(
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
 * Draw from ISA category (S&S ISA) for one partner.
 */
function drawISAFromPartner(
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
 * Draw from SIPP category with tax gross-up for one partner.
 */
function drawSIPPFromPartner(
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
 * Draw from a category using A-first tie-break.
 * Exhausts partner A's balance in this category before touching partner B's.
 */
function drawAFirst(
  category: DrawdownCategory,
  need: number,
  balancesA: AccountBalances,
  balancesB: AccountBalances,
  marginalRateA: number,
  marginalRateB: number,
): { newBalancesA: AccountBalances; newBalancesB: AccountBalances; drawnA: number; drawnB: number; taxA: number; taxB: number } {
  let currentA = balancesA
  let currentB = balancesB
  let drawnA = 0
  let drawnB = 0
  let taxA = 0
  let taxB = 0
  let remaining = need

  // Try A first
  if (remaining > 0) {
    if (category === 'Cash') {
      const result = drawCashFromPartner(currentA, remaining)
      currentA = result.newBalances
      drawnA = result.drawn
      remaining -= result.drawn
    } else if (category === 'ISA') {
      const result = drawISAFromPartner(currentA, remaining)
      currentA = result.newBalances
      drawnA = result.drawn
      remaining -= result.drawn
    } else { // SIPP
      const result = drawSIPPFromPartner(currentA, remaining, marginalRateA)
      currentA = result.newBalances
      drawnA = result.drawn
      taxA = result.taxPaid
      remaining -= result.drawn
    }
  }

  // Then B if needed
  if (remaining > 0) {
    if (category === 'Cash') {
      const result = drawCashFromPartner(currentB, remaining)
      currentB = result.newBalances
      drawnB = result.drawn
    } else if (category === 'ISA') {
      const result = drawISAFromPartner(currentB, remaining)
      currentB = result.newBalances
      drawnB = result.drawn
    } else { // SIPP
      const result = drawSIPPFromPartner(currentB, remaining, marginalRateB)
      currentB = result.newBalances
      drawnB = result.drawn
      taxB = result.taxPaid
    }
  }

  return {
    newBalancesA: currentA,
    newBalancesB: currentB,
    drawnA,
    drawnB,
    taxA,
    taxB,
  }
}

/**
 * Draw from a category using B-first tie-break.
 * Exhausts partner B's balance in this category before touching partner A's.
 */
function drawBFirst(
  category: DrawdownCategory,
  need: number,
  balancesA: AccountBalances,
  balancesB: AccountBalances,
  marginalRateA: number,
  marginalRateB: number,
): { newBalancesA: AccountBalances; newBalancesB: AccountBalances; drawnA: number; drawnB: number; taxA: number; taxB: number } {
  // Just swap A and B in the A-first logic
  const result = drawAFirst(category, need, balancesB, balancesA, marginalRateB, marginalRateA)
  return {
    newBalancesA: result.newBalancesB,
    newBalancesB: result.newBalancesA,
    drawnA: result.drawnB,
    drawnB: result.drawnA,
    taxA: result.taxB,
    taxB: result.taxA,
  }
}

/**
 * Draw from a category using proportional tie-break.
 * Draws from both partners in proportion to their balances in this category.
 */
function drawProportional(
  category: DrawdownCategory,
  need: number,
  balancesA: AccountBalances,
  balancesB: AccountBalances,
  marginalRateA: number,
  marginalRateB: number,
): { newBalancesA: AccountBalances; newBalancesB: AccountBalances; drawnA: number; drawnB: number; taxA: number; taxB: number } {
  const availableA = getCategoryTotal(balancesA, category)
  const availableB = getCategoryTotal(balancesB, category)
  const total = availableA + availableB

  if (total <= 0) {
    return {
      newBalancesA: balancesA,
      newBalancesB: balancesB,
      drawnA: 0,
      drawnB: 0,
      taxA: 0,
      taxB: 0,
    }
  }

  // Calculate proportional split
  const fractionA = availableA / total
  const fractionB = availableB / total

  let targetA = Math.min(need * fractionA, availableA)
  let targetB = Math.min(need * fractionB, availableB)

  // If one partner can't meet their proportion, take remainder from the other
  const shortfall = need - targetA - targetB
  if (shortfall > 0.01) { // Use small epsilon for floating point comparison
    if (targetA < need * fractionA && availableB > targetB) {
      // A is exhausted, take more from B
      targetB = Math.min(targetB + shortfall, availableB)
    } else if (targetB < need * fractionB && availableA > targetA) {
      // B is exhausted, take more from A
      targetA = Math.min(targetA + shortfall, availableA)
    }
  }

  let currentA = balancesA
  let currentB = balancesB
  let drawnA = 0
  let drawnB = 0
  let taxA = 0
  let taxB = 0

  // Draw from A
  if (targetA > 0) {
    if (category === 'Cash') {
      const result = drawCashFromPartner(currentA, targetA)
      currentA = result.newBalances
      drawnA = result.drawn
    } else if (category === 'ISA') {
      const result = drawISAFromPartner(currentA, targetA)
      currentA = result.newBalances
      drawnA = result.drawn
    } else { // SIPP
      const result = drawSIPPFromPartner(currentA, targetA, marginalRateA)
      currentA = result.newBalances
      drawnA = result.drawn
      taxA = result.taxPaid
    }
  }

  // Draw from B
  if (targetB > 0) {
    if (category === 'Cash') {
      const result = drawCashFromPartner(currentB, targetB)
      currentB = result.newBalances
      drawnB = result.drawn
    } else if (category === 'ISA') {
      const result = drawISAFromPartner(currentB, targetB)
      currentB = result.newBalances
      drawnB = result.drawn
    } else { // SIPP
      const result = drawSIPPFromPartner(currentB, targetB, marginalRateB)
      currentB = result.newBalances
      drawnB = result.drawn
      taxB = result.taxPaid
    }
  }

  return {
    newBalancesA: currentA,
    newBalancesB: currentB,
    drawnA,
    drawnB,
    taxA,
    taxB,
  }
}

/**
 * Execute household drawdown to meet a monthly spending need.
 *
 * Two-layer process:
 * 1. Process categories in the specified order (Cash, ISA, SIPP)
 * 2. Within each category, apply the owner tie-break rule (A-first, B-first, or proportional)
 */
export function executeHouseholdDrawdown(
  balances: PartnerBalances,
  spendingNeed: number,
  drawdownOrder: DrawdownCategory[],
  ownerTieBreak: OwnerTieBreak,
  marginalRateA: number,
  marginalRateB: number,
): HouseholdDrawdownResult {
  let balancesA = { ...balances.a }
  let balancesB = { ...balances.b }
  // Deep copy wrapper objects
  balancesA.sipp = { ...balances.a.sipp }
  balancesA.ssISA = { ...balances.a.ssISA }
  balancesB.sipp = { ...balances.b.sipp }
  balancesB.ssISA = { ...balances.b.ssISA }

  let remaining = spendingNeed
  let totalTaxA = 0
  let totalTaxB = 0

  for (const category of drawdownOrder) {
    if (remaining <= 0) break

    const totalAvailable = getCategoryTotal(balancesA, category) + getCategoryTotal(balancesB, category)
    if (totalAvailable <= 0) continue

    let result
    switch (ownerTieBreak) {
      case 'A-first':
        result = drawAFirst(category, remaining, balancesA, balancesB, marginalRateA, marginalRateB)
        break
      case 'B-first':
        result = drawBFirst(category, remaining, balancesA, balancesB, marginalRateA, marginalRateB)
        break
      case 'proportional':
        result = drawProportional(category, remaining, balancesA, balancesB, marginalRateA, marginalRateB)
        break
    }

    balancesA = result.newBalancesA
    balancesB = result.newBalancesB
    remaining -= (result.drawnA + result.drawnB)
    totalTaxA += result.taxA
    totalTaxB += result.taxB
  }

  return {
    newBalances: { a: balancesA, b: balancesB },
    taxPaidA: totalTaxA,
    taxPaidB: totalTaxB,
    spendingMet: spendingNeed - remaining,
  }
}
