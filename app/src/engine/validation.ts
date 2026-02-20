/**
 * Input validation for the simulation engine.
 *
 * Returns warnings for invalid or problematic input combinations.
 * These are soft validations — the simulation can still run, but
 * results may not be meaningful.
 */

import type { Inputs } from '@/types'
import type { SimulationWarning } from './types'

/** Validate user inputs and return any warnings. */
export function validateInputs(inputs: Inputs): SimulationWarning[] {
  const warnings: SimulationWarning[] = []

  // Age validations
  if (inputs.currentAge < 18 || inputs.currentAge > 100) {
    warnings.push({
      type: 'input_validation',
      message: 'Current age must be between 18 and 100',
    })
  }

  if (inputs.retirementAge <= inputs.currentAge) {
    warnings.push({
      type: 'input_validation',
      message: 'Retirement age must be after current age',
    })
  }

  if (inputs.longevity <= inputs.retirementAge) {
    warnings.push({
      type: 'input_validation',
      message: 'Longevity must be after retirement age',
    })
  }

  if (inputs.retirementAge < inputs.minPensionAge) {
    const sippFirst = inputs.drawdownOrder[0] === 'SIPP'
    if (sippFirst) {
      warnings.push({
        type: 'input_validation',
        message: `Retirement age ${inputs.retirementAge} is before minimum pension access age ${inputs.minPensionAge} — SIPP cannot be accessed first`,
      })
    }
  }

  // Negative monetary values
  if (inputs.salary < 0) {
    warnings.push({ type: 'input_validation', message: 'Salary cannot be negative' })
  }
  if (inputs.annualSpending < 0) {
    warnings.push({ type: 'input_validation', message: 'Annual spending cannot be negative' })
  }
  if (inputs.monthlyISA < 0) {
    warnings.push({ type: 'input_validation', message: 'Monthly ISA contribution cannot be negative' })
  }

  // Negative balances
  if (inputs.sippBalance < 0 || inputs.ssISABalance < 0 || inputs.cashISABalance < 0 || inputs.cashSavingsBalance < 0) {
    warnings.push({ type: 'input_validation', message: 'Account balances cannot be negative' })
  }

  // Percentage range validations
  if (inputs.stockBondSplitPct < 0 || inputs.stockBondSplitPct > 100) {
    warnings.push({ type: 'input_validation', message: 'Equity allocation must be between 0% and 100%' })
  }
  if (inputs.ssISASplitPct < 0 || inputs.ssISASplitPct > 100) {
    warnings.push({ type: 'input_validation', message: 'S&S ISA split must be between 0% and 100%' })
  }
  if (inputs.employeePensionPct < 0 || inputs.employeePensionPct > 100) {
    warnings.push({ type: 'input_validation', message: 'Employee pension contribution must be between 0% and 100%' })
  }
  if (inputs.employerPensionPct < 0 || inputs.employerPensionPct > 100) {
    warnings.push({ type: 'input_validation', message: 'Employer pension contribution must be between 0% and 100%' })
  }
  if (inputs.employeePensionPct + inputs.employerPensionPct > 100) {
    warnings.push({ type: 'input_validation', message: 'Total pension contributions exceed 100% of salary' })
  }

  // Spending step-down validations
  for (const step of inputs.spendingStepDowns) {
    if (step.age <= inputs.retirementAge) {
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
