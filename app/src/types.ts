export interface SpendingStepDown {
  age: number
  amount: number // annual, today's money
}

export interface OneOffExpense {
  year: number
  amount: number // today's money
}

export type DrawdownCategory = 'Cash' | 'ISA' | 'SIPP'

export interface Inputs {
  // The Basics
  currentAge: number
  retirementAge: number
  annualSpending: number // today's money

  // Income & Savings
  salary: number
  employeePensionPct: number
  employerPensionPct: number
  monthlyISA: number
  ssISASplitPct: number // % of ISA going to S&S (rest to Cash ISA)
  salaryGrowthPct: number

  // Current Balances
  sippBalance: number
  ssISABalance: number
  cashISABalance: number
  cashSavingsBalance: number
  stockBondSplitPct: number // % in equities

  // Advanced
  drawdownOrder: DrawdownCategory[]
  spendingStepDowns: SpendingStepDown[]
  oneOffExpenses: OneOffExpense[]
  statePensionOverride: number | null

  // Assumptions
  inflationPct: number
  equityGrowthPct: number
  bondRatePct: number
  cashRatePct: number
  statePensionAge: number
  minPensionAge: number
  statePensionAmount: number
  longevity: number
}

export interface YearProjection {
  age: number
  salary: number
  contributions: number
  spending: number
  sippBalance: number
  isaBalance: number
  cashBalance: number
  totalNetWorth: number
  taxPaid: number
}

export const DEFAULT_INPUTS: Inputs = {
  currentAge: 40,
  retirementAge: 60,
  annualSpending: 30000,

  salary: 65000,
  employeePensionPct: 10,
  employerPensionPct: 5,
  monthlyISA: 500,
  ssISASplitPct: 80,
  salaryGrowthPct: 3,

  sippBalance: 150000,
  ssISABalance: 50000,
  cashISABalance: 10000,
  cashSavingsBalance: 20000,
  stockBondSplitPct: 70,

  drawdownOrder: ['Cash', 'ISA', 'SIPP'],
  spendingStepDowns: [],
  oneOffExpenses: [],
  statePensionOverride: null,

  inflationPct: 2,
  equityGrowthPct: 6,
  bondRatePct: 4,
  cashRatePct: 4,
  statePensionAge: 68,
  minPensionAge: 57,
  statePensionAmount: 11500,
  longevity: 100,
}
