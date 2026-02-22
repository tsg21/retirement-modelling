export interface SpendingStepDown {
  age: number
  amount: number // annual, today's money
}

export interface OneOffExpense {
  year: number
  amount: number // today's money
  description?: string
}

export type DrawdownCategory = 'Cash' | 'ISA' | 'SIPP'
export type HouseholdType = 'single' | 'marriedCouple'
export type OwnerTieBreak = 'A-first' | 'B-first' | 'proportional'

// Person-specific inputs (reusable for single mode and each partner in couple mode)
export interface PersonInputs {
  currentAge: number
  retirementAge: number
  salary: number
  employeePensionPct: number
  employerPensionPct: number
  monthlyISA: number
  ssISASplitPct: number // % of ISA going to S&S (rest to Cash ISA)
  salaryGrowthPct: number
  sippBalance: number
  ssISABalance: number
  cashISABalance: number
  cashSavingsBalance: number
  stockBondSplitPct: number // % in equities
  statePensionAge: number
  minPensionAge: number
  statePensionAmount: number
  statePensionOverride: number | null
}

// Shared household-level inputs
export interface SharedInputs {
  annualSpending: number // today's money
  drawdownOrder: DrawdownCategory[]
  spendingStepDowns: SpendingStepDown[]
  oneOffExpenses: OneOffExpense[]
  inflationPct: number
  equityGrowthPct: number
  bondRatePct: number
  cashRatePct: number
  longevity: number
}

// Discriminated union on householdType
export type Inputs =
  | (SharedInputs & PersonInputs & { householdType: 'single' })
  | (SharedInputs & {
      householdType: 'marriedCouple'
      partnerA: PersonInputs
      partnerB: PersonInputs
      ownerTieBreak: OwnerTieBreak
    })

export interface PartnerProjection {
  age: number
  salary: number
  contributions: number
  taxPaid: number
  sippBalance: number
  isaBalance: number
  cashBalance: number
}

export interface YearProjection {
  // Time dimension: years since simulation start (0, 1, 2, ...)
  simulationYear: number

  // Partner data (partnerA always present, partnerB only in couple mode)
  partnerA: PartnerProjection
  partnerB?: PartnerProjection

  // Household totals
  spending: number
  totalNetWorth: number
}

// Default person inputs (reusable)
const DEFAULT_PERSON_INPUTS: PersonInputs = {
  currentAge: 40,
  retirementAge: 60,
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
  statePensionAge: 68,
  minPensionAge: 57,
  statePensionAmount: 11500,
  statePensionOverride: null,
}

// Default shared household inputs
const DEFAULT_SHARED_INPUTS: SharedInputs = {
  annualSpending: 30000,
  drawdownOrder: ['Cash', 'ISA', 'SIPP'],
  spendingStepDowns: [],
  oneOffExpenses: [],
  inflationPct: 2,
  equityGrowthPct: 6,
  bondRatePct: 4,
  cashRatePct: 4,
  longevity: 100,
}

// Default inputs for single mode
export const DEFAULT_INPUTS: Extract<Inputs, { householdType: 'single' }> = {
  householdType: 'single',
  ...DEFAULT_SHARED_INPUTS,
  ...DEFAULT_PERSON_INPUTS,
}

// Default inputs for married couple mode
export const DEFAULT_COUPLE_INPUTS: Extract<Inputs, { householdType: 'marriedCouple' }> = {
  householdType: 'marriedCouple',
  ...DEFAULT_SHARED_INPUTS,
  partnerA: { ...DEFAULT_PERSON_INPUTS },
  partnerB: {
    ...DEFAULT_PERSON_INPUTS,
    currentAge: 38, // Slightly younger partner
    retirementAge: 60,
    salary: 55000,
    sippBalance: 100000,
    ssISABalance: 30000,
  },
  ownerTieBreak: 'proportional',
}
