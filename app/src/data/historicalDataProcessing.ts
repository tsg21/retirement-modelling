// Pure functions for processing raw historical CSV data into monthly returns.
// No fs/node dependencies — this module is testable with Vitest.

export interface MonthlyPrice {
  year: number
  month: number
  close: number
}

export interface MonthlyValue {
  year: number
  month: number
  value: number
}

export interface HistoricalMonth {
  year: number
  month: number // 1-12
  equityReturn: number // decimal fraction
  bondReturn: number
  cashReturn: number
  inflationRate: number
}

const ASSUMED_DIVIDEND_YIELD = 3.5 / 100 // annual
const GILT_DURATION = 8 // approximate modified duration for 10y gilt
const CASH_SPREAD = 0.5 // percentage points below base rate

function monthKey(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function parseIsoDate(dateStr: string): { year: number; month: number } {
  const [yearStr, monthStr] = dateStr.split('-')
  return { year: parseInt(yearStr, 10), month: parseInt(monthStr, 10) }
}

const MONTH_NAMES: Record<string, number> = {
  Jan: 1, Feb: 2, Mar: 3, Apr: 4, May: 5, Jun: 6,
  Jul: 7, Aug: 8, Sep: 9, Oct: 10, Nov: 11, Dec: 12,
}

function parseBoeDate(dateStr: string): { year: number; month: number; day: number } {
  const parts = dateStr.trim().split(' ')
  const day = parseInt(parts[0], 10)
  const month = MONTH_NAMES[parts[1]]
  const year = parseInt(parts[2], 10)
  return { year, month, day }
}

/**
 * Parse FTSE All-Share CSV (3 header rows, then monthly data).
 * Extracts Close prices. Stops at any gap > 1 month between consecutive rows.
 */
export function parseFtseAllShare(csv: string): MonthlyPrice[] {
  const lines = csv.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  // Skip 3 header rows: Price, Ticker, Date
  const dataLines = lines.slice(3)
  const result: MonthlyPrice[] = []

  for (const line of dataLines) {
    const cols = line.split(',')
    const { year, month } = parseIsoDate(cols[0])
    const close = parseFloat(cols[1])

    // Detect gap: if previous entry exists, check continuity
    if (result.length > 0) {
      const prev = result[result.length - 1]
      const prevMonths = prev.year * 12 + prev.month
      const currMonths = year * 12 + month
      if (currMonths - prevMonths > 1) {
        break // Gap detected, stop here
      }
    }

    result.push({ year, month, close })
  }

  return result
}

/**
 * Parse FRED CPI CSV (1 header row, monthly data).
 */
export function parseCpiFred(csv: string): MonthlyValue[] {
  const lines = csv.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  return lines.slice(1).map(line => {
    const cols = line.split(',')
    const { year, month } = parseIsoDate(cols[0])
    return { year, month, value: parseFloat(cols[1]) }
  })
}

/**
 * Parse FRED 10y gilt yield CSV (1 header row, monthly data).
 * Values are yield percentages (e.g., 5.33).
 */
export function parseGiltYieldFred(csv: string): MonthlyValue[] {
  const lines = csv.split('\n').map(l => l.trim()).filter(l => l.length > 0)
  return lines.slice(1).map(line => {
    const cols = line.split(',')
    const { year, month } = parseIsoDate(cols[0])
    return { year, month, value: parseFloat(cols[1]) }
  })
}

/**
 * Parse BoE base rate CSV (daily data, DD MMM YYYY format).
 * Returns one entry per month using the last available rate in each month.
 */
export function parseBoeBaseRate(csv: string): MonthlyValue[] {
  const lines = csv.split('\n').map(l => l.replace(/\r$/, '').trim()).filter(l => l.length > 0)
  const dataLines = lines.slice(1)

  // Group by year-month, keeping the last rate for each month
  const monthlyRates = new Map<string, MonthlyValue>()

  for (const line of dataLines) {
    const commaIdx = line.indexOf(',')
    if (commaIdx === -1) continue
    const dateStr = line.substring(0, commaIdx)
    const rateStr = line.substring(commaIdx + 1)
    const { year, month } = parseBoeDate(dateStr)
    const rate = parseFloat(rateStr)
    const key = monthKey(year, month)
    // Overwrite: since daily data is chronological, the last entry wins
    monthlyRates.set(key, { year, month, value: rate })
  }

  // Sort by date
  return Array.from(monthlyRates.values()).sort(
    (a, b) => a.year * 12 + a.month - (b.year * 12 + b.month)
  )
}

/**
 * Compute monthly returns for the overlapping window of all 4 datasets.
 * Returns are decimal fractions (e.g., 0.01 = 1%).
 */
export function computeReturns(
  ftse: MonthlyPrice[],
  cpi: MonthlyValue[],
  gilt: MonthlyValue[],
  boe: MonthlyValue[],
): HistoricalMonth[] {
  // Build lookup maps
  const cpiMap = new Map(cpi.map(d => [monthKey(d.year, d.month), d.value]))
  const giltMap = new Map(gilt.map(d => [monthKey(d.year, d.month), d.value]))
  const boeMap = new Map(boe.map(d => [monthKey(d.year, d.month), d.value]))

  const result: HistoricalMonth[] = []

  for (let i = 1; i < ftse.length; i++) {
    const prev = ftse[i - 1]
    const curr = ftse[i]

    const currKey = monthKey(curr.year, curr.month)
    const prevKey = monthKey(prev.year, prev.month)

    const cpiCurr = cpiMap.get(currKey)
    const cpiPrev = cpiMap.get(prevKey)
    const giltCurr = giltMap.get(currKey)
    const giltPrev = giltMap.get(prevKey)
    const boeCurr = boeMap.get(currKey)

    // Skip months where any data source is missing
    if (cpiCurr === undefined || cpiPrev === undefined ||
        giltCurr === undefined || giltPrev === undefined ||
        boeCurr === undefined) {
      continue
    }

    // Equity: price return + assumed dividend yield
    const equityReturn = (curr.close / prev.close - 1) + ASSUMED_DIVIDEND_YIELD / 12

    // Bond: coupon income + price change from yield movement
    const bondReturn = giltCurr / 100 / 12 + (-GILT_DURATION * (giltCurr - giltPrev) / 100)

    // Cash: base rate minus spread, monthly, floored at 0
    const cashReturn = Math.max(0, (boeCurr - CASH_SPREAD) / 100 / 12)

    // Inflation: month-over-month CPI change
    const inflationRate = cpiCurr / cpiPrev - 1

    result.push({
      year: curr.year,
      month: curr.month,
      equityReturn,
      bondReturn,
      cashReturn,
      inflationRate,
    })
  }

  return result
}

/**
 * Validate that all output values are within plausible ranges.
 * Throws if any value is out of range.
 */
export function validateOutput(data: HistoricalMonth[]): void {
  for (const d of data) {
    const label = `${d.year}-${String(d.month).padStart(2, '0')}`
    if (d.equityReturn < -0.30 || d.equityReturn > 0.30) {
      throw new Error(`Equity return out of range at ${label}: ${d.equityReturn}`)
    }
    if (d.bondReturn < -0.15 || d.bondReturn > 0.15) {
      throw new Error(`Bond return out of range at ${label}: ${d.bondReturn}`)
    }
    if (d.cashReturn < 0 || d.cashReturn > 0.02) {
      throw new Error(`Cash return out of range at ${label}: ${d.cashReturn}`)
    }
    if (d.inflationRate < -0.03 || d.inflationRate > 0.05) {
      throw new Error(`Inflation rate out of range at ${label}: ${d.inflationRate}`)
    }
  }
}
