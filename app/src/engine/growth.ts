/**
 * Monthly investment growth applied to account balances.
 *
 * - SIPP and S&S ISA: equity portion at equity rate, bond portion at bond rate.
 *   Target allocation is maintained each month (no drift).
 * - Cash ISA and Cash Savings: both at cash interest rate.
 * - All rates are annual nominal, converted to monthly.
 */

import type { AccountBalances, WrapperBalance } from './types'

/** Convert an annual rate to a monthly rate: (1 + annual)^(1/12) - 1 */
export function annualToMonthly(annualRate: number): number {
  return Math.pow(1 + annualRate, 1 / 12) - 1
}

/** Apply one month of growth to a wrapper with equity/bond split */
export function growWrapper(
  balance: WrapperBalance,
  monthlyEquityRate: number,
  monthlyBondRate: number,
): WrapperBalance {
  return {
    equities: balance.equities * (1 + monthlyEquityRate),
    bonds: balance.bonds * (1 + monthlyBondRate),
  }
}

/** Apply one month of growth to a cash balance */
export function growCash(balance: number, monthlyCashRate: number): number {
  return balance * (1 + monthlyCashRate)
}

export interface GrowthRates {
  equityRate: number  // annual nominal
  bondRate: number    // annual nominal
  cashRate: number    // annual nominal
}

/**
 * Apply one month of investment growth to all accounts.
 * Returns new balances and total growth amount.
 */
export function applyMonthlyGrowth(
  balances: AccountBalances,
  rates: GrowthRates,
): { newBalances: AccountBalances; totalGrowth: number } {
  const monthlyEquity = annualToMonthly(rates.equityRate)
  const monthlyBond = annualToMonthly(rates.bondRate)
  const monthlyCash = annualToMonthly(rates.cashRate)

  const newBalances: AccountBalances = {
    sipp: growWrapper(balances.sipp, monthlyEquity, monthlyBond),
    ssISA: growWrapper(balances.ssISA, monthlyEquity, monthlyBond),
    cashISA: growCash(balances.cashISA, monthlyCash),
    cashSavings: growCash(balances.cashSavings, monthlyCash),
  }

  const oldTotal = totalBalance(balances)
  const newTotal = totalBalance(newBalances)

  return {
    newBalances,
    totalGrowth: newTotal - oldTotal,
  }
}

/** Sum all balances across all accounts */
export function totalBalance(b: AccountBalances): number {
  return (
    b.sipp.equities + b.sipp.bonds +
    b.ssISA.equities + b.ssISA.bonds +
    b.cashISA +
    b.cashSavings
  )
}
