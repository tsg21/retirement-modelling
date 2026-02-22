/**
 * Input validation for the simulation engine.
 *
 * Returns warnings for invalid or problematic input combinations.
 * These are soft validations — the simulation can still run, but
 * results may not be meaningful.
 */

import type { Inputs, PersonInputs, DrawdownCategory } from '@/types'
import type { SimulationWarning } from './types'

/** Validate user inputs and return any warnings. */
export function validateInputs(inputs: Inputs): SimulationWarning[] {
  if (inputs.householdType === 'single') {
    return validateSingleInputs(inputs)
  } else {
    return validateCoupleInputs(inputs)
  }
}

/** Validate single-person inputs */
function validateSingleInputs(inputs: Inputs & { householdType: 'single' }): SimulationWarning[] {
  const warnings: SimulationWarning[] = []

  // Validate person-specific inputs
  warnings.push(...validatePersonInputs(inputs, '', inputs.drawdownOrder, inputs.longevity))

  // Household-level validations
  warnings.push(...validateHouseholdInputs(inputs))

  return warnings
}

/** Validate married-couple inputs */
function validateCoupleInputs(inputs: Inputs & { householdType: 'marriedCouple' }): SimulationWarning[] {
  const warnings: SimulationWarning[] = []

  // Validate each partner
  warnings.push(...validatePersonInputs(inputs.partnerA, 'Partner A: ', inputs.drawdownOrder, inputs.longevity))
  warnings.push(...validatePersonInputs(inputs.partnerB, 'Partner B: ', inputs.drawdownOrder, inputs.longevity))

  // Household-level validations
  warnings.push(...validateHouseholdInputs(inputs))

  return warnings
}

/** Validate person-specific inputs (reusable for single mode and each partner) */
function validatePersonInputs(
  person: PersonInputs,
  labelPrefix: string,
  drawdownOrder: DrawdownCategory[],
  longevity: number
): SimulationWarning[] {
  const warnings: SimulationWarning[] = []

  // Age validations
  if (person.currentAge < 18 || person.currentAge > 100) {
    warnings.push({
      type: 'input_validation',
      message: `${labelPrefix}Current age must be between 18 and 100`,
    })
  }

  if (person.retirementAge <= person.currentAge) {
    warnings.push({
      type: 'input_validation',
      message: `${labelPrefix}Retirement age must be after current age`,
    })
  }

  if (longevity <= person.retirementAge) {
    warnings.push({
      type: 'input_validation',
      message: `${labelPrefix}Longevity must be after retirement age`,
    })
  }

  if (person.retirementAge < person.minPensionAge) {
    const sippFirst = drawdownOrder[0] === 'SIPP'
    if (sippFirst) {
      warnings.push({
        type: 'input_validation',
        message: `${labelPrefix}Retirement age ${person.retirementAge} is before minimum pension access age ${person.minPensionAge} — SIPP cannot be accessed first`,
      })
    }
  }

  // Negative monetary values
  if (person.salary < 0) {
    warnings.push({ type: 'input_validation', message: `${labelPrefix}Salary cannot be negative` })
  }
  if (person.monthlyISA < 0) {
    warnings.push({ type: 'input_validation', message: `${labelPrefix}Monthly ISA contribution cannot be negative` })
  }

  // Negative balances
  if (person.sippBalance < 0 || person.ssISABalance < 0 || person.cashISABalance < 0 || person.cashSavingsBalance < 0) {
    warnings.push({ type: 'input_validation', message: `${labelPrefix}Account balances cannot be negative` })
  }

  // Percentage range validations
  if (person.stockBondSplitPct < 0 || person.stockBondSplitPct > 100) {
    warnings.push({ type: 'input_validation', message: `${labelPrefix}Equity allocation must be between 0% and 100%` })
  }
  if (person.ssISASplitPct < 0 || person.ssISASplitPct > 100) {
    warnings.push({ type: 'input_validation', message: `${labelPrefix}S&S ISA split must be between 0% and 100%` })
  }
  if (person.employeePensionPct < 0 || person.employeePensionPct > 100) {
    warnings.push({ type: 'input_validation', message: `${labelPrefix}Employee pension contribution must be between 0% and 100%` })
  }
  if (person.employerPensionPct < 0 || person.employerPensionPct > 100) {
    warnings.push({ type: 'input_validation', message: `${labelPrefix}Employer pension contribution must be between 0% and 100%` })
  }
  if (person.employeePensionPct + person.employerPensionPct > 100) {
    warnings.push({ type: 'input_validation', message: `${labelPrefix}Total pension contributions exceed 100% of salary` })
  }

  return warnings
}

/** Validate household-level inputs (shared between single and couple mode) */
function validateHouseholdInputs(inputs: Inputs): SimulationWarning[] {
  const warnings: SimulationWarning[] = []

  // Annual spending
  if (inputs.annualSpending < 0) {
    warnings.push({ type: 'input_validation', message: 'Annual spending cannot be negative' })
  }

  // Spending step-down validations
  for (const step of inputs.spendingStepDowns) {
    // In couple mode, check against earliest retirement age
    const earliestRetirement = inputs.householdType === 'single'
      ? inputs.retirementAge
      : Math.min(inputs.partnerA.retirementAge, inputs.partnerB.retirementAge)

    if (step.age <= earliestRetirement) {
      warnings.push({
        type: 'input_validation',
        message: `Spending step-down at age ${step.age} is before or at retirement age`,
      })
    }
    if (step.amount < 0) {
      warnings.push({
        type: 'input_validation',
        message: `Spending step-down at age ${step.age} has a negative amount`,
      })
    }
  }

  // One-off expense validations
  const currentYear = new Date().getFullYear()
  for (const expense of inputs.oneOffExpenses) {
    if (expense.amount < 0) {
      warnings.push({
        type: 'input_validation',
        message: `One-off expense in ${expense.year} has a negative amount`,
      })
    }
    if (expense.year < currentYear) {
      warnings.push({
        type: 'input_validation',
        message: `One-off expense in ${expense.year} is in the past`,
      })
    }
  }

  return warnings
}
