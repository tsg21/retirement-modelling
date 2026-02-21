/**
 * Month-by-month retirement simulation loop.
 *
 * Orchestrates all engine modules to produce a full projection from
 * current age to longevity. Pure function — no side effects.
 */

import type { Inputs } from '@/types'
import type {
  AccountBalances,
  MonthSnapshot,
  RateProvider,
  SimulationResult,
  SimulationWarning,
  WrapperBalance,
} from './types'
import { fixedRateProvider } from './rateProvider'
import { applyMonthlyGrowth, totalBalance } from './growth'
import { advanceInflation, balancesToReal } from './inflation'
import { computeMonthlyContributions } from './contributions'
import { executeDrawdown } from './drawdown'
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

/**
 * Run the month-by-month retirement simulation.
 *
 * @param inputs - User inputs (accounts, rates, ages, etc.)
 * @param startYear - Calendar year the simulation starts in (defaults to current year)
 * @param rateProvider - Provides growth/inflation rates for each month (defaults to fixed rates from inputs)
 */
export function simulate(inputs: Inputs, startYear?: number, rateProvider?: RateProvider): SimulationResult {
  const effectiveStartYear = startYear ?? new Date().getFullYear()
  const getRates = rateProvider ?? fixedRateProvider(inputs)
  const equityFraction = inputs.stockBondSplitPct / 100

  // --- Initialise account balances ---
  let balances: AccountBalances = {
    sipp: {
      equities: inputs.sippBalance * equityFraction,
      bonds: inputs.sippBalance * (1 - equityFraction),
    },
    ssISA: {
      equities: inputs.ssISABalance * equityFraction,
      bonds: inputs.ssISABalance * (1 - equityFraction),
    },
    cashISA: inputs.cashISABalance,
    cashSavings: inputs.cashSavingsBalance,
  }

  const totalMonths = Math.round((inputs.longevity - inputs.currentAge) * 12)
  const months: MonthSnapshot[] = []
  const warnings: SimulationWarning[] = [...validateInputs(inputs)]

  let cumulativeInflation = 1.0
  let currentSalary = inputs.salary
  let currentMarginalRate = 0
  let contributionYearSalary = inputs.salary
  let annualSIPPContrib = 0
  let annualISAContrib = 0

  const statePensionAnnual = inputs.statePensionOverride ?? inputs.statePensionAmount

  // Track which calendar years have had one-off expenses processed
  const triggeredOneOffYears = new Set<number>()

  // Initial marginal rate estimate
  {
    const inflatedBands = inflateBands(BASE_TAX_BANDS, cumulativeInflation)
    let fixedIncome = 0
    if (inputs.currentAge >= inputs.statePensionAge) {
      fixedIncome = annualStatePensionNominal(statePensionAnnual, cumulativeInflation)
    }
    currentMarginalRate = marginalRate(fixedIncome, inflatedBands)
  }

  for (let monthIndex = 0; monthIndex < totalMonths; monthIndex++) {
    const age = inputs.currentAge + monthIndex / 12
    const isRetired = age >= inputs.retirementAge
    const calendarYear = effectiveStartYear + Math.floor(monthIndex / 12)
    const isNewSimYear = monthIndex > 0 && monthIndex % 12 === 0

    // --- Start of simulation year ---
    if (isNewSimYear) {
      // Validate previous year's contributions
      checkContributionLimits(
        annualSIPPContrib,
        annualISAContrib,
        contributionYearSalary,
        cumulativeInflation,
        Math.floor(age - 1),
        calendarYear - 1,
        warnings,
      )
      annualSIPPContrib = 0
      annualISAContrib = 0

      // Salary growth (pre-retirement only)
      if (!isRetired) {
        currentSalary *= 1 + inputs.salaryGrowthPct / 100
      }
      contributionYearSalary = currentSalary

      // Re-estimate marginal rate from fixed income
      const inflatedBands = inflateBands(BASE_TAX_BANDS, cumulativeInflation)
      let fixedIncome = 0
      if (age >= inputs.statePensionAge) {
        fixedIncome = annualStatePensionNominal(statePensionAnnual, cumulativeInflation)
      }
      currentMarginalRate = marginalRate(fixedIncome, inflatedBands)
    }

    // --- Monthly operations ---
    let monthlyContributions = 0
    let monthlySpending = 0
    let monthlyStatePension = 0
    let monthlyTaxPaid = 0

    // Is this the first simulation month of this calendar year?
    const isFirstMonthOfCalYear = !triggeredOneOffYears.has(calendarYear)
    if (isFirstMonthOfCalYear) {
      triggeredOneOffYears.add(calendarYear)
    }

    if (!isRetired) {
      // === PRE-RETIREMENT ===

      // 1-3. Compute and add contributions
      const contribs = computeMonthlyContributions({
        salary: currentSalary,
        employeePensionPct: inputs.employeePensionPct,
        employerPensionPct: inputs.employerPensionPct,
        monthlyISA: inputs.monthlyISA,
        ssISASplitPct: inputs.ssISASplitPct,
        stockBondSplitPct: inputs.stockBondSplitPct,
      })

      balances.sipp.equities += contribs.sipp.equities
      balances.sipp.bonds += contribs.sipp.bonds
      balances.ssISA.equities += contribs.ssISA.equities
      balances.ssISA.bonds += contribs.ssISA.bonds
      balances.cashISA += contribs.cashISA

      monthlyContributions = contribs.total
      annualSIPPContrib += contribs.sipp.equities + contribs.sipp.bonds
      annualISAContrib += contribs.ssISA.equities + contribs.ssISA.bonds + contribs.cashISA
    } else {
      // === POST-RETIREMENT ===

      // 1-2. Compute spending need (regular + one-off)
      const { regularSpending, oneOffAmount } = computeMonthlySpending(
        inputs.annualSpending,
        inputs.spendingStepDowns,
        isFirstMonthOfCalYear ? inputs.oneOffExpenses : [],
        age,
        calendarYear,
        cumulativeInflation,
        true,
      )

      monthlySpending = regularSpending + oneOffAmount

      // 3. State pension reduces drawdown need
      monthlyStatePension = computeMonthlyStatePension(
        age,
        inputs.statePensionAge,
        statePensionAnnual,
        cumulativeInflation,
      )

      // 4. Execute drawdown for remaining need
      const drawdownNeed = Math.max(0, monthlySpending - monthlyStatePension)
      if (drawdownNeed > 0) {
        const result = executeDrawdown(
          balances,
          drawdownNeed,
          inputs.drawdownOrder,
          currentMarginalRate,
        )
        balances = result.newBalances
        monthlyTaxPaid = result.taxPaid
      }
    }

    // 4/5. Apply investment growth (all months)
    const rates = getRates(monthIndex)
    const { newBalances, totalGrowth } = applyMonthlyGrowth(balances, {
      equityRate: rates.equityRate,
      bondRate: rates.bondRate,
      cashRate: rates.cashRate,
    })
    balances = newBalances

    // Rebalance to maintain target equity/bond allocation
    balances.sipp = rebalance(balances.sipp, equityFraction)
    balances.ssISA = rebalance(balances.ssISA, equityFraction)

    // 5. Pre-retirement one-off expenses (after growth, per spec)
    if (!isRetired && isFirstMonthOfCalYear) {
      for (const expense of inputs.oneOffExpenses) {
        if (expense.year === calendarYear) {
          const nominalExpense = expense.amount * cumulativeInflation
          if (nominalExpense > balances.cashSavings) {
            warnings.push({
              type: 'expense_exceeds_cash',
              message: `One-off expense of £${expense.amount.toLocaleString()} in ${calendarYear} exceeds cash savings — shortfall of £${Math.round((nominalExpense - balances.cashSavings) / cumulativeInflation).toLocaleString()} (today's money)`,
              year: calendarYear,
            })
          }
          balances.cashSavings = Math.max(0, balances.cashSavings - nominalExpense)
        }
      }
    }

    // Advance cumulative inflation
    cumulativeInflation = advanceInflation(cumulativeInflation, rates.inflationRate)

    // --- Record snapshot ---
    const nominalTotal = totalBalance(balances)
    const balancesReal = balancesToReal(balances, cumulativeInflation)

    months.push({
      monthIndex,
      age,
      isRetired,
      balancesNominal: {
        sipp: { ...balances.sipp },
        ssISA: { ...balances.ssISA },
        cashISA: balances.cashISA,
        cashSavings: balances.cashSavings,
      },
      balancesReal,
      totalNominal: nominalTotal,
      totalReal: totalBalance(balancesReal),
      cumulativeInflation,
      salary: isRetired ? 0 : currentSalary,
      contributions: monthlyContributions,
      spending: monthlySpending,
      statePensionIncome: monthlyStatePension,
      taxPaid: monthlyTaxPaid,
      investmentGrowth: totalGrowth,
    })
  }

  // --- Compute summary ---
  const retirementMonthIndex = Math.round((inputs.retirementAge - inputs.currentAge) * 12)

  let totalAtRetirement: number
  if (retirementMonthIndex > 0 && retirementMonthIndex <= months.length) {
    // Value at end of last pre-retirement month (in today's money)
    totalAtRetirement = months[retirementMonthIndex - 1].totalReal
  } else {
    // Already retired at simulation start
    totalAtRetirement =
      inputs.sippBalance + inputs.ssISABalance + inputs.cashISABalance + inputs.cashSavingsBalance
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
      ? ageMoneyRunsOut - inputs.retirementAge
      : inputs.longevity - inputs.retirementAge

  return {
    months,
    summary: { totalAtRetirement, ageMoneyRunsOut, yearsFunded },
    warnings,
  }
}

/** Check annual contributions against ISA and SIPP limits. */
function checkContributionLimits(
  annualSIPP: number,
  annualISA: number,
  salary: number,
  cumulativeInflation: number,
  ageAtYearStart: number,
  calendarYear: number,
  warnings: SimulationWarning[],
): void {
  if (annualSIPP === 0 && annualISA === 0) return

  const isaLimit = 20_000 * cumulativeInflation
  const sippLimit = 60_000 * cumulativeInflation

  if (annualISA > isaLimit) {
    warnings.push({
      type: 'isa_limit',
      message: `ISA contributions exceed annual limit at age ${ageAtYearStart}`,
      year: calendarYear,
    })
  }

  if (annualSIPP > sippLimit) {
    warnings.push({
      type: 'sipp_limit',
      message: `SIPP contributions exceed annual allowance at age ${ageAtYearStart}`,
      year: calendarYear,
    })
  }

  if (annualSIPP > salary) {
    warnings.push({
      type: 'sipp_limit',
      message: `SIPP contributions exceed 100% of earnings at age ${ageAtYearStart}`,
      year: calendarYear,
    })
  }
}
