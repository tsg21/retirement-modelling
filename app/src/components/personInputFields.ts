import type { PersonInputs } from '../types'

export interface PersonNumberFieldConfig {
  key: keyof PersonInputs
  label: string
  prefix?: string
  suffix?: string
  min?: number
  max?: number
  step?: number
  value?: (person: PersonInputs) => number
}

export const incomeAndSavingsFields: PersonNumberFieldConfig[] = [
  { key: 'salary', label: 'Current salary', prefix: '£', step: 1000 },
  { key: 'employeePensionPct', label: 'Employee pension contribution', suffix: '%', min: 0, max: 100 },
  { key: 'employerPensionPct', label: 'Employer pension contribution', suffix: '%', min: 0, max: 100 },
  { key: 'monthlyISA', label: 'Monthly ISA contribution', prefix: '£', step: 50 },
  { key: 'ssISASplitPct', label: 'S&S ISA split', suffix: '% S&S', min: 0, max: 100 },
  { key: 'salaryGrowthPct', label: 'Salary growth', suffix: '%', step: 0.5 },
]

export const currentBalanceFields: PersonNumberFieldConfig[] = [
  { key: 'sippBalance', label: 'SIPP', prefix: '£', step: 1000 },
  { key: 'ssISABalance', label: 'Stocks & Shares ISA', prefix: '£', step: 1000 },
  { key: 'cashISABalance', label: 'Cash ISA', prefix: '£', step: 1000 },
  { key: 'cashSavingsBalance', label: 'Cash Savings', prefix: '£', step: 1000 },
  {
    key: 'stockBondSplitPct',
    label: 'SIPP & S&S ISA equities allocation',
    suffix: '% equities',
    min: 0,
    max: 100,
  },
]

export const statePensionFields: PersonNumberFieldConfig[] = [
  {
    key: 'statePensionOverride',
    label: 'State pension (annual)',
    prefix: '£',
    step: 100,
    value: person => person.statePensionOverride ?? person.statePensionAmount,
  },
  { key: 'statePensionAge', label: 'State pension age', min: 60, max: 75 },
  { key: 'minPensionAge', label: 'Minimum pension access age', min: 55, max: 60 },
]
