/**
 * Engine-internal types for the month-by-month simulation.
 *
 * The engine consumes `Inputs` from `@/types` and produces `SimulationResult`.
 * These types describe the detailed internal state that the engine tracks.
 */

/** Balances within a single wrapper, split by asset class */
export interface WrapperBalance {
  equities: number
  bonds: number
}

/** All account balances at a point in time (nominal values) */
export interface AccountBalances {
  sipp: WrapperBalance       // SIPP — equities + bonds
  ssISA: WrapperBalance      // Stocks & Shares ISA — equities + bonds
  cashISA: number            // Cash ISA — cash only
  cashSavings: number        // Cash Savings — cash only
}

/** Snapshot of the simulation state at the end of a single month */
export interface MonthSnapshot {
  /** Month index from simulation start (0-based) */
  monthIndex: number
  /** Age at this month (fractional, e.g. 40.25 = 40 years 3 months) */
  age: number
  /** Whether this month is post-retirement */
  isRetired: boolean

  /** All account balances in nominal terms */
  balancesNominal: AccountBalances
  /** All account balances in today's money (deflated by cumulative inflation) */
  balancesReal: AccountBalances

  /** Total net worth in nominal terms */
  totalNominal: number
  /** Total net worth in today's money */
  totalReal: number

  /** Cumulative inflation factor from simulation start (e.g. 1.02 after 1 year at 2%) */
  cumulativeInflation: number

  // --- Monthly flows (nominal) ---

  /** Gross salary this month (0 if retired) */
  salary: number
  /** Total contributions this month (pension + ISA, 0 if retired) */
  contributions: number
  /** Spending this month (0 if pre-retirement) */
  spending: number
  /** State pension income this month (0 if not yet at state pension age) */
  statePensionIncome: number
  /** Tax paid this month (from SIPP drawdown gross-up) */
  taxPaid: number
  /** Total investment growth this month across all accounts */
  investmentGrowth: number
}

/** Summary statistics for the simulation run */
export interface SimulationSummary {
  /** Total pot value at retirement (real terms) */
  totalAtRetirement: number
  /** Age when money runs out, or null if it lasts to longevity */
  ageMoneyRunsOut: number | null
  /** Number of years of retirement funded */
  yearsFunded: number
}

/** Warning from input validation or contribution limit checks */
export interface SimulationWarning {
  type: 'isa_limit' | 'sipp_limit' | 'expense_exceeds_cash' | 'input_validation'
  message: string
  /** Year or age the warning applies to, if relevant */
  year?: number
}

/** Complete output of a simulation run */
export interface SimulationResult {
  /** Monthly snapshots from start to end of simulation */
  months: MonthSnapshot[]
  /** High-level summary */
  summary: SimulationSummary
  /** Warnings about contribution limits or input issues */
  warnings: SimulationWarning[]
}
