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

/** Partner-specific snapshot data (for married-couple mode) */
export interface PartnerSnapshot {
  /** Age at this month (fractional) */
  age: number
  /** Whether this partner is retired this month */
  isRetired: boolean
  /** Partner's account balances in nominal terms */
  balancesNominal: AccountBalances
  /** Partner's account balances in today's money */
  balancesReal: AccountBalances
  /** Gross salary this month (0 if retired) */
  salary: number
  /** Total contributions this month (pension + ISA, 0 if retired) */
  contributions: number
  /** State pension income this month (0 if not yet at state pension age) */
  statePensionIncome: number
  /** Tax paid this month (from SIPP drawdown gross-up) */
  taxPaid: number
}

/** Household snapshot for married-couple mode (extends MonthSnapshot with partner breakdown) */
export interface HouseholdMonthSnapshot extends MonthSnapshot {
  /** Partner A snapshot (only present in couple mode) */
  partnerA?: PartnerSnapshot
  /** Partner B snapshot (only present in couple mode) */
  partnerB?: PartnerSnapshot
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

/** Rates for a single simulation month (all annual nominal decimals, e.g. 0.06 = 6%) */
export interface MonthlyRates {
  equityRate: number
  bondRate: number
  cashRate: number
  inflationRate: number
}

/** Returns rates for a given simulation month. Used by simulate() to look up growth/inflation. */
export type RateProvider = (monthIndex: number) => MonthlyRates

/** Complete output of a simulation run */
export interface SimulationResult {
  /** Monthly snapshots from start to end of simulation */
  months: MonthSnapshot[]
  /** High-level summary */
  summary: SimulationSummary
  /** Warnings about contribution limits or input issues */
  warnings: SimulationWarning[]
}

// --- Backtesting types ---

/** Result of running a single historical scenario */
export interface ScenarioResult {
  startYear: number
  result: SimulationResult
}

/** Percentile values for total net worth (real) at a single age */
export interface PercentileBand {
  age: number
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
}

/** Info about the worst-performing historical scenario */
export interface WorstCase {
  startYear: number
  ageMoneyRunsOut: number
}

/** Complete output of a backtesting run */
export interface BacktestResult {
  /** Individual scenario results */
  scenarios: ScenarioResult[]
  /** Percentile bands of total net worth (real) at each age */
  percentileBands: PercentileBand[]
  /** Fraction (0–1) of scenarios where money lasts to longevity */
  successRate: number
  /** Worst-case scenario, or null if all scenarios succeed */
  worstCase: WorstCase | null
}
