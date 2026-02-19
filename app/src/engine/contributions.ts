/**
 * Monthly contributions to pension and ISA accounts (pre-retirement only).
 *
 * - SIPP: (employee% + employer%) × salary / 12 via salary sacrifice
 * - S&S ISA: monthlyISA × ssISASplitPct / 100
 * - Cash ISA: monthlyISA × (1 - ssISASplitPct / 100)
 */

import type { WrapperBalance } from './types'

export interface ContributionInputs {
  salary: number           // current annual gross salary (nominal)
  employeePensionPct: number
  employerPensionPct: number
  monthlyISA: number       // monthly ISA contribution (nominal)
  ssISASplitPct: number    // % of ISA going to S&S ISA
  stockBondSplitPct: number // % of invested assets in equities
}

export interface MonthlyContributions {
  sipp: WrapperBalance     // split into equities/bonds per allocation
  ssISA: WrapperBalance    // split into equities/bonds per allocation
  cashISA: number
  total: number            // sum of all contributions
}

/**
 * Compute monthly contributions to each account.
 */
export function computeMonthlyContributions(inputs: ContributionInputs): MonthlyContributions {
  // SIPP: salary sacrifice (employee + employer)
  const totalPensionPct = inputs.employeePensionPct + inputs.employerPensionPct
  const monthlySIPP = (totalPensionPct / 100) * inputs.salary / 12

  // Split SIPP contribution between equities and bonds
  const equityFraction = inputs.stockBondSplitPct / 100
  const sipp: WrapperBalance = {
    equities: monthlySIPP * equityFraction,
    bonds: monthlySIPP * (1 - equityFraction),
  }

  // ISA split
  const monthlySsISA = inputs.monthlyISA * (inputs.ssISASplitPct / 100)
  const monthlyCashISA = inputs.monthlyISA * (1 - inputs.ssISASplitPct / 100)

  // Split S&S ISA contribution between equities and bonds
  const ssISA: WrapperBalance = {
    equities: monthlySsISA * equityFraction,
    bonds: monthlySsISA * (1 - equityFraction),
  }

  return {
    sipp,
    ssISA,
    cashISA: monthlyCashISA,
    total: monthlySIPP + monthlySsISA + monthlyCashISA,
  }
}
