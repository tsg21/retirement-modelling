/**
 * Month-by-month retirement simulation for married couples.
 *
 * Similar structure to simulate.ts but handles two partners with:
 * - Separate balances, ages, retirement dates, salaries
 * - Shared household spending target
 * - Tax computed per partner (no pooling)
 * - Two-layer drawdown (category order, then owner tie-break)
 */

import type { Inputs, PersonInputs } from '@/types'
import type {
  AccountBalances,
  HouseholdMonthSnapshot,
  PartnerSnapshot,
  RateProvider,
  SimulationResult,
  SimulationWarning,
  WrapperBalance,
} from './types'
import { fixedRateProvider } from './rateProvider'
import { applyMonthlyGrowth, totalBalance } from './growth'
import { advanceInflation, balancesToReal } from './inflation'
import { computeMonthlyContributions } from './contributions'
import { executeHouseholdDrawdown } from './drawdownCouple'
import { computeMonthlySpending } from './spending'
import { computeMonthlyStatePension, annualStatePensionNominal } from './statePension'
import { marginalRate, inflateBands, BASE_TAX_BANDS } from './tax'
import { validateInputs } from './validation'

/** Rebalance a wrapper to maintain the target equity/bond allocation. */
function rebalance(wrapper: WrapperBalance, equityFraction: number): WrapperBalance {
  const total = wrapper.equities + wrapper.bonds
  if (total <= 0) return { equities: 0, bonds: 0 }
  return {
    equities: total * equityFraction,
    bonds: total * (1 - equityFraction),
  }
}

/** Initialize account balances from person inputs */
function initializeBalances(person: PersonInputs): AccountBalances {
  const equityFraction = person.stockBondSplitPct / 100
  return {
    sipp: {
      equities: person.sippBalance * equityFraction,
      bonds: person.sippBalance * (1 - equityFraction),
    },
    ssISA: {
      equities: person.ssISABalance * equityFraction,
      bonds: person.ssISABalance * (1 - equityFraction),
    },
    cashISA: person.cashISABalance,
    cashSavings: person.cashSavingsBalance,
  }
}

/**
 * Run the month-by-month couple retirement simulation.
 *
 * @param inputs - Couple inputs (partner A, partner B, household shared)
 * @param rateProvider - Provides growth/inflation rates for each month (defaults to fixed rates from inputs)
 */
export function simulateCouple(
  inputs: Inputs & { householdType: 'marriedCouple' },
  rateProvider?: RateProvider,
): SimulationResult {
  const effectiveStartYear = new Date().getFullYear()
  const getRates = rateProvider ?? fixedRateProvider(inputs)

  // --- Initialize balances per partner ---
  let balancesA = initializeBalances(inputs.partnerA)
  let balancesB = initializeBalances(inputs.partnerB)

  // Determine simulation duration based on older partner
  const maxStartAge = Math.max(inputs.partnerA.currentAge, inputs.partnerB.currentAge)
  const totalMonths = Math.round((inputs.longevity - maxStartAge) * 12)

  const months: HouseholdMonthSnapshot[] = []
  const warnings: SimulationWarning[] = [...validateInputs(inputs)]

  let cumulativeInflation = 1.0

  // Partner A state
  let salaryA = inputs.partnerA.salary
  let marginalRateA = 0
  let contributionYearSalaryA = inputs.partnerA.salary
  let annualSIPPContribA = 0
  let annualISAContribA = 0

  // Partner B state
  let salaryB = inputs.partnerB.salary
  let marginalRateB = 0
  let contributionYearSalaryB = inputs.partnerB.salary
  let annualSIPPContribB = 0
  let annualISAContribB = 0

  const statePensionAnnualA = inputs.partnerA.statePensionOverride ?? inputs.partnerA.statePensionAmount
  const statePensionAnnualB = inputs.partnerB.statePensionOverride ?? inputs.partnerB.statePensionAmount

  // Track which calendar years have had one-off expenses processed
  const triggeredOneOffYears = new Set<number>()

  // Initial marginal rate estimates
  {
    const inflatedBands = inflateBands(BASE_TAX_BANDS, cumulativeInflation)

    let fixedIncomeA = 0
    if (inputs.partnerA.currentAge >= inputs.partnerA.statePensionAge) {
      fixedIncomeA = annualStatePensionNominal(statePensionAnnualA, cumulativeInflation)
    }
    marginalRateA = marginalRate(fixedIncomeA, inflatedBands)

    let fixedIncomeB = 0
    if (inputs.partnerB.currentAge >= inputs.partnerB.statePensionAge) {
      fixedIncomeB = annualStatePensionNominal(statePensionAnnualB, cumulativeInflation)
    }
    marginalRateB = marginalRate(fixedIncomeB, inflatedBands)
  }

  for (let monthIndex = 0; monthIndex < totalMonths; monthIndex++) {
    const ageA = inputs.partnerA.currentAge + monthIndex / 12
    const ageB = inputs.partnerB.currentAge + monthIndex / 12
    const isRetiredA = ageA >= inputs.partnerA.retirementAge
    const isRetiredB = ageB >= inputs.partnerB.retirementAge
    const calendarYear = effectiveStartYear + Math.floor(monthIndex / 12)
    const isNewSimYear = monthIndex > 0 && monthIndex % 12 === 0

    // --- Start of simulation year ---
    if (isNewSimYear) {
      // Validate previous year's contributions for Partner A
      checkContributionLimits(
        annualSIPPContribA,
        annualISAContribA,
        contributionYearSalaryA,
        cumulativeInflation,
        Math.floor(ageA - 1),
        calendarYear - 1,
        'Partner A',
        warnings,
      )
      annualSIPPContribA = 0
      annualISAContribA = 0

      // Validate previous year's contributions for Partner B
      checkContributionLimits(
        annualSIPPContribB,
        annualISAContribB,
        contributionYearSalaryB,
        cumulativeInflation,
        Math.floor(ageB - 1),
        calendarYear - 1,
        'Partner B',
        warnings,
      )
      annualSIPPContribB = 0
      annualISAContribB = 0

      // Salary growth (pre-retirement only, per partner)
      if (!isRetiredA) {
        salaryA *= 1 + inputs.partnerA.salaryGrowthPct / 100
      }
      contributionYearSalaryA = salaryA

      if (!isRetiredB) {
        salaryB *= 1 + inputs.partnerB.salaryGrowthPct / 100
      }
      contributionYearSalaryB = salaryB

      // Re-estimate marginal rates from fixed income (per partner)
      const inflatedBands = inflateBands(BASE_TAX_BANDS, cumulativeInflation)

      let fixedIncomeA = 0
      if (ageA >= inputs.partnerA.statePensionAge) {
        fixedIncomeA = annualStatePensionNominal(statePensionAnnualA, cumulativeInflation)
      }
      marginalRateA = marginalRate(fixedIncomeA, inflatedBands)

      let fixedIncomeB = 0
      if (ageB >= inputs.partnerB.statePensionAge) {
        fixedIncomeB = annualStatePensionNominal(statePensionAnnualB, cumulativeInflation)
      }
      marginalRateB = marginalRate(fixedIncomeB, inflatedBands)
    }

    // --- Monthly operations ---
    let monthlyContributionsA = 0
    let monthlyContributionsB = 0
    let monthlySpending = 0
    let monthlyStatePensionA = 0
    let monthlyStatePensionB = 0
    let monthlyTaxPaidA = 0
    let monthlyTaxPaidB = 0

    // Is this the first simulation month of this calendar year?
    const isFirstMonthOfCalYear = !triggeredOneOffYears.has(calendarYear)
    if (isFirstMonthOfCalYear) {
      triggeredOneOffYears.add(calendarYear)
    }

    // === PRE-RETIREMENT CONTRIBUTIONS (per partner) ===
    if (!isRetiredA) {
      const contribs = computeMonthlyContributions({
        salary: salaryA,
        employeePensionPct: inputs.partnerA.employeePensionPct,
        employerPensionPct: inputs.partnerA.employerPensionPct,
        monthlyISA: inputs.partnerA.monthlyISA,
        ssISASplitPct: inputs.partnerA.ssISASplitPct,
        stockBondSplitPct: inputs.partnerA.stockBondSplitPct,
      })

      balancesA.sipp.equities += contribs.sipp.equities
      balancesA.sipp.bonds += contribs.sipp.bonds
      balancesA.ssISA.equities += contribs.ssISA.equities
      balancesA.ssISA.bonds += contribs.ssISA.bonds
      balancesA.cashISA += contribs.cashISA

      monthlyContributionsA = contribs.total
      annualSIPPContribA += contribs.sipp.equities + contribs.sipp.bonds
      annualISAContribA += contribs.ssISA.equities + contribs.ssISA.bonds + contribs.cashISA
    }

    if (!isRetiredB) {
      const contribs = computeMonthlyContributions({
        salary: salaryB,
        employeePensionPct: inputs.partnerB.employeePensionPct,
        employerPensionPct: inputs.partnerB.employerPensionPct,
        monthlyISA: inputs.partnerB.monthlyISA,
        ssISASplitPct: inputs.partnerB.ssISASplitPct,
        stockBondSplitPct: inputs.partnerB.stockBondSplitPct,
      })

      balancesB.sipp.equities += contribs.sipp.equities
      balancesB.sipp.bonds += contribs.sipp.bonds
      balancesB.ssISA.equities += contribs.ssISA.equities
      balancesB.ssISA.bonds += contribs.ssISA.bonds
      balancesB.cashISA += contribs.cashISA

      monthlyContributionsB = contribs.total
      annualSIPPContribB += contribs.sipp.equities + contribs.sipp.bonds
      annualISAContribB += contribs.ssISA.equities + contribs.ssISA.bonds + contribs.cashISA
    }

    // === POST-RETIREMENT (if either partner retired) ===
    if (isRetiredA || isRetiredB) {
      // 1-2. Compute household spending need (regular + one-off)
      // Use the age of the older partner for age-based step-downs
      const referenceAge = Math.max(ageA, ageB)
      const { regularSpending, oneOffAmount } = computeMonthlySpending(
        inputs.annualSpending,
        inputs.spendingStepDowns,
        isFirstMonthOfCalYear ? inputs.oneOffExpenses : [],
        referenceAge,
        calendarYear,
        cumulativeInflation,
        true, // isPostRetirement
      )

      monthlySpending = regularSpending + oneOffAmount

      // 3. State pension income per partner
      monthlyStatePensionA = computeMonthlyStatePension(
        ageA,
        inputs.partnerA.statePensionAge,
        statePensionAnnualA,
        cumulativeInflation,
      )

      monthlyStatePensionB = computeMonthlyStatePension(
        ageB,
        inputs.partnerB.statePensionAge,
        statePensionAnnualB,
        cumulativeInflation,
      )

      // 4. Execute household drawdown for remaining need
      const totalStatePension = monthlyStatePensionA + monthlyStatePensionB
      const drawdownNeed = Math.max(0, monthlySpending - totalStatePension)

      if (drawdownNeed > 0) {
        const result = executeHouseholdDrawdown(
          { a: balancesA, b: balancesB },
          drawdownNeed,
          inputs.drawdownOrder,
          inputs.ownerTieBreak,
          marginalRateA,
          marginalRateB,
        )
        balancesA = result.newBalances.a
        balancesB = result.newBalances.b
        monthlyTaxPaidA = result.taxPaidA
        monthlyTaxPaidB = result.taxPaidB
      }
    }

    // 4/5. Apply investment growth (all months, per partner)
    const rates = getRates(monthIndex)

    const growthA = applyMonthlyGrowth(balancesA, {
      equityRate: rates.equityRate,
      bondRate: rates.bondRate,
      cashRate: rates.cashRate,
    })
    balancesA = growthA.newBalances

    const growthB = applyMonthlyGrowth(balancesB, {
      equityRate: rates.equityRate,
      bondRate: rates.bondRate,
      cashRate: rates.cashRate,
    })
    balancesB = growthB.newBalances

    // Rebalance to maintain target equity/bond allocation (per partner)
    const equityFractionA = inputs.partnerA.stockBondSplitPct / 100
    balancesA.sipp = rebalance(balancesA.sipp, equityFractionA)
    balancesA.ssISA = rebalance(balancesA.ssISA, equityFractionA)

    const equityFractionB = inputs.partnerB.stockBondSplitPct / 100
    balancesB.sipp = rebalance(balancesB.sipp, equityFractionB)
    balancesB.ssISA = rebalance(balancesB.ssISA, equityFractionB)

    // Advance cumulative inflation
    cumulativeInflation = advanceInflation(cumulativeInflation, rates.inflationRate)

    // --- Record household snapshot ---
    const nominalTotalA = totalBalance(balancesA)
    const nominalTotalB = totalBalance(balancesB)
    const nominalTotal = nominalTotalA + nominalTotalB

    const balancesRealA = balancesToReal(balancesA, cumulativeInflation)
    const balancesRealB = balancesToReal(balancesB, cumulativeInflation)
    const totalRealA = totalBalance(balancesRealA)
    const totalRealB = totalBalance(balancesRealB)
    const totalReal = totalRealA + totalRealB

    const partnerSnapshotA: PartnerSnapshot = {
      age: ageA,
      isRetired: isRetiredA,
      balancesNominal: {
        sipp: { ...balancesA.sipp },
        ssISA: { ...balancesA.ssISA },
        cashISA: balancesA.cashISA,
        cashSavings: balancesA.cashSavings,
      },
      balancesReal: balancesRealA,
      salary: isRetiredA ? 0 : salaryA,
      contributions: monthlyContributionsA,
      statePensionIncome: monthlyStatePensionA,
      taxPaid: monthlyTaxPaidA,
    }

    const partnerSnapshotB: PartnerSnapshot = {
      age: ageB,
      isRetired: isRetiredB,
      balancesNominal: {
        sipp: { ...balancesB.sipp },
        ssISA: { ...balancesB.ssISA },
        cashISA: balancesB.cashISA,
        cashSavings: balancesB.cashSavings,
      },
      balancesReal: balancesRealB,
      salary: isRetiredB ? 0 : salaryB,
      contributions: monthlyContributionsB,
      statePensionIncome: monthlyStatePensionB,
      taxPaid: monthlyTaxPaidB,
    }

    // Create combined snapshot for household
    // Use older partner's age as the primary age
    const householdAge = Math.max(ageA, ageB)
    const householdIsRetired = isRetiredA || isRetiredB

    months.push({
      monthIndex,
      age: householdAge,
      isRetired: householdIsRetired,
      balancesNominal: {
        // Combined balances (sum of both partners)
        sipp: {
          equities: balancesA.sipp.equities + balancesB.sipp.equities,
          bonds: balancesA.sipp.bonds + balancesB.sipp.bonds,
        },
        ssISA: {
          equities: balancesA.ssISA.equities + balancesB.ssISA.equities,
          bonds: balancesA.ssISA.bonds + balancesB.ssISA.bonds,
        },
        cashISA: balancesA.cashISA + balancesB.cashISA,
        cashSavings: balancesA.cashSavings + balancesB.cashSavings,
      },
      balancesReal: {
        sipp: {
          equities: balancesRealA.sipp.equities + balancesRealB.sipp.equities,
          bonds: balancesRealA.sipp.bonds + balancesRealB.sipp.bonds,
        },
        ssISA: {
          equities: balancesRealA.ssISA.equities + balancesRealB.ssISA.equities,
          bonds: balancesRealA.ssISA.bonds + balancesRealB.ssISA.bonds,
        },
        cashISA: balancesRealA.cashISA + balancesRealB.cashISA,
        cashSavings: balancesRealA.cashSavings + balancesRealB.cashSavings,
      },
      totalNominal: nominalTotal,
      totalReal: totalReal,
      cumulativeInflation,
      salary: partnerSnapshotA.salary + partnerSnapshotB.salary,
      contributions: monthlyContributionsA + monthlyContributionsB,
      spending: monthlySpending,
      statePensionIncome: monthlyStatePensionA + monthlyStatePensionB,
      taxPaid: monthlyTaxPaidA + monthlyTaxPaidB,
      investmentGrowth: growthA.totalGrowth + growthB.totalGrowth,
      partnerA: partnerSnapshotA,
      partnerB: partnerSnapshotB,
    })
  }

  // --- Compute summary ---
  // Use earliest retirement age for household
  const earliestRetirementAge = Math.min(inputs.partnerA.retirementAge, inputs.partnerB.retirementAge)
  const retirementMonthIndex = Math.round((earliestRetirementAge - maxStartAge) * 12)

  let totalAtRetirement: number
  if (retirementMonthIndex > 0 && retirementMonthIndex <= months.length) {
    // Value at end of last pre-retirement month (in today's money)
    totalAtRetirement = months[retirementMonthIndex - 1].totalReal
  } else {
    // Already retired at simulation start
    totalAtRetirement =
      inputs.partnerA.sippBalance +
      inputs.partnerA.ssISABalance +
      inputs.partnerA.cashISABalance +
      inputs.partnerA.cashSavingsBalance +
      inputs.partnerB.sippBalance +
      inputs.partnerB.ssISABalance +
      inputs.partnerB.cashISABalance +
      inputs.partnerB.cashSavingsBalance
  }

  let ageMoneyRunsOut: number | null = null
  for (const snapshot of months) {
    if (snapshot.isRetired && snapshot.totalNominal < 1) {
      ageMoneyRunsOut = snapshot.age
      break
    }
  }

  const yearsFunded =
    ageMoneyRunsOut !== null
      ? ageMoneyRunsOut - earliestRetirementAge
      : inputs.longevity - earliestRetirementAge

  return {
    months,
    summary: { totalAtRetirement, ageMoneyRunsOut, yearsFunded },
    warnings,
  }
}

/** Check annual contributions against ISA and SIPP limits (per partner). */
function checkContributionLimits(
  annualSIPP: number,
  annualISA: number,
  salary: number,
  cumulativeInflation: number,
  ageAtYearStart: number,
  calendarYear: number,
  partnerLabel: string,
  warnings: SimulationWarning[],
): void {
  if (annualSIPP === 0 && annualISA === 0) return

  const isaLimit = 20_000 * cumulativeInflation
  const sippLimit = 60_000 * cumulativeInflation

  if (annualISA > isaLimit) {
    warnings.push({
      type: 'isa_limit',
      message: `${partnerLabel}: ISA contributions exceed annual limit at age ${ageAtYearStart}`,
      year: calendarYear,
    })
  }

  if (annualSIPP > sippLimit) {
    warnings.push({
      type: 'sipp_limit',
      message: `${partnerLabel}: SIPP contributions exceed annual allowance at age ${ageAtYearStart}`,
      year: calendarYear,
    })
  }

  if (annualSIPP > salary) {
    warnings.push({
      type: 'sipp_limit',
      message: `${partnerLabel}: SIPP contributions exceed 100% of earnings at age ${ageAtYearStart}`,
      year: calendarYear,
    })
  }
}
