import { describe, it, expect } from 'vitest'
import {
  parseFtseAllShare,
  parseCpiFred,
  parseGiltYieldFred,
  parseBoeBaseRate,
  computeReturns,
  validateOutput,
  type HistoricalMonth,
} from './historicalDataProcessing'
import historicalData from './historicalReturns.json'

// --- Unit tests for CSV parsers ---

describe('parseFtseAllShare', () => {
  it('skips 3 header rows and parses close prices', () => {
    const csv = `Price,Close,High,Low,Open,Volume
Ticker,^FTAS,^FTAS,^FTAS,^FTAS,^FTAS
Date,,,,,
1985-01-01,613.69,627.28,581.88,588.57,0
1985-02-01,608.13,622.89,606.89,612.75,0`
    const result = parseFtseAllShare(csv)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ year: 1985, month: 1, close: 613.69 })
    expect(result[1]).toEqual({ year: 1985, month: 2, close: 608.13 })
  })

  it('stops at gap in dates', () => {
    const csv = `Price,Close,High,Low,Open,Volume
Ticker,^FTAS,^FTAS,^FTAS,^FTAS,^FTAS
Date,,,,,
2022-01-01,4200,0,0,0,0
2022-02-01,4300,0,0,0,0
2022-03-01,4100,0,0,0,0
2026-02-01,5700,0,0,0,0`
    const result = parseFtseAllShare(csv)
    expect(result).toHaveLength(3)
    expect(result[2]).toEqual({ year: 2022, month: 3, close: 4100 })
  })
})

describe('parseCpiFred', () => {
  it('parses header and data rows', () => {
    const csv = `observation_date,GBRCPIALLMINMEI
1955-01-01,4.8595
1955-02-01,4.8595`
    const result = parseCpiFred(csv)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ year: 1955, month: 1, value: 4.8595 })
  })
})

describe('parseGiltYieldFred', () => {
  it('parses header and data rows', () => {
    const csv = `observation_date,IRLTLT01GBM156N
1960-01-01,5.3300
1960-02-01,5.4000`
    const result = parseGiltYieldFred(csv)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ year: 1960, month: 1, value: 5.33 })
    expect(result[1]).toEqual({ year: 1960, month: 2, value: 5.4 })
  })
})

describe('parseBoeBaseRate', () => {
  it('parses DD MMM YYYY format and takes last rate per month', () => {
    const csv = `DATE,IUDBEDR
02 Jan 1975,11.5
20 Jan 1975,11.25
03 Feb 1975,11.25
28 Feb 1975,10.75`
    const result = parseBoeBaseRate(csv)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ year: 1975, month: 1, value: 11.25 })
    expect(result[1]).toEqual({ year: 1975, month: 2, value: 10.75 })
  })

  it('handles \\r\\n line endings and trailing whitespace', () => {
    const csv = 'DATE,IUDBEDR\r\n02 Jan 1975,11.5\r\n\r\n'
    const result = parseBoeBaseRate(csv)
    expect(result).toHaveLength(1)
    expect(result[0].value).toBe(11.5)
  })
})

// --- Unit tests for return computations ---

describe('computeReturns', () => {
  const makeFtse = (prices: number[]) =>
    prices.map((close, i) => ({ year: 2000, month: i + 1, close }))

  const makeMonthly = (values: number[]) =>
    values.map((value, i) => ({ year: 2000, month: i + 1, value }))

  it('computes equity return as price return + dividend yield', () => {
    const ftse = makeFtse([100, 102])
    const cpi = makeMonthly([100, 100.5])
    const gilt = makeMonthly([5.0, 5.0])
    const boe = makeMonthly([5.0, 5.0])
    const result = computeReturns(ftse, cpi, gilt, boe)
    expect(result).toHaveLength(1)
    expect(result[0].equityReturn).toBeCloseTo(0.02 + 3.5 / 100 / 12, 10)
  })

  it('computes bond return from yield changes', () => {
    const ftse = makeFtse([100, 105])
    const cpi = makeMonthly([100, 100.2])
    const gilt = makeMonthly([5.0, 5.1]) // yield rises 0.1pp
    const boe = makeMonthly([5.0, 5.0])
    const result = computeReturns(ftse, cpi, gilt, boe)
    // coupon: 5.1/100/12 = 0.00425
    // price change: -8 * (0.1)/100 = -0.008
    // total: -0.00375
    expect(result[0].bondReturn).toBeCloseTo(5.1 / 100 / 12 + (-8 * 0.1 / 100), 10)
  })

  it('computes cash return with 0.5% spread', () => {
    const ftse = makeFtse([100, 105])
    const cpi = makeMonthly([100, 100.2])
    const gilt = makeMonthly([5.0, 5.0])
    const boe = makeMonthly([5.75, 5.75])
    const result = computeReturns(ftse, cpi, gilt, boe)
    expect(result[0].cashReturn).toBeCloseTo((5.75 - 0.5) / 100 / 12, 10)
  })

  it('floors cash return at zero when base rate < 0.5%', () => {
    const ftse = makeFtse([100, 105])
    const cpi = makeMonthly([100, 100.2])
    const gilt = makeMonthly([5.0, 5.0])
    const boe = makeMonthly([0.1, 0.1])
    const result = computeReturns(ftse, cpi, gilt, boe)
    expect(result[0].cashReturn).toBe(0)
  })

  it('computes inflation from CPI ratio', () => {
    const ftse = makeFtse([100, 105])
    const cpi = makeMonthly([100, 100.5])
    const gilt = makeMonthly([5.0, 5.0])
    const boe = makeMonthly([5.0, 5.0])
    const result = computeReturns(ftse, cpi, gilt, boe)
    expect(result[0].inflationRate).toBeCloseTo(0.005, 10)
  })

  it('skips months with missing data', () => {
    const ftse = makeFtse([100, 105, 110])
    const cpi = makeMonthly([100, 100.5]) // only 2 months
    const gilt = makeMonthly([5.0, 5.0, 5.1])
    const boe = makeMonthly([5.0, 5.0, 5.0])
    const result = computeReturns(ftse, cpi, gilt, boe)
    // Month 3 should be skipped (no CPI data)
    expect(result).toHaveLength(1)
  })
})

describe('validateOutput', () => {
  it('passes for valid data', () => {
    const data: HistoricalMonth[] = [{
      year: 2000, month: 1,
      equityReturn: 0.01, bondReturn: 0.005,
      cashReturn: 0.003, inflationRate: 0.002,
    }]
    expect(() => validateOutput(data)).not.toThrow()
  })

  it('throws for extreme equity return', () => {
    const data: HistoricalMonth[] = [{
      year: 2000, month: 1,
      equityReturn: 0.5, bondReturn: 0.005,
      cashReturn: 0.003, inflationRate: 0.002,
    }]
    expect(() => validateOutput(data)).toThrow(/Equity return out of range/)
  })
})

// --- Output JSON verification ---

describe('historicalReturns.json', () => {
  it('has approximately 446 months of data', () => {
    expect(historicalData.length).toBeGreaterThanOrEqual(440)
    expect(historicalData.length).toBeLessThanOrEqual(450)
  })

  it('starts at 1985-02', () => {
    expect(historicalData[0].year).toBe(1985)
    expect(historicalData[0].month).toBe(2)
  })

  it('ends at 2022-03', () => {
    const last = historicalData[historicalData.length - 1]
    expect(last.year).toBe(2022)
    expect(last.month).toBe(3)
  })

  it('has no gaps in months', () => {
    for (let i = 1; i < historicalData.length; i++) {
      const prev = historicalData[i - 1]
      const curr = historicalData[i]
      const prevMonths = prev.year * 12 + prev.month
      const currMonths = curr.year * 12 + curr.month
      expect(currMonths - prevMonths).toBe(1)
    }
  })

  // Spot-check Feb 2000 against raw data:
  // FTSE Jan 2000: 2975.8701171875, Feb 2000: 2989.429931640625
  // CPI Jan 2000: 72.5999999999999943, Feb 2000: 72.7999999999999972
  // Gilt Jan 2000: 5.8227, Feb 2000: 5.6347
  // BOE Feb 2000 last rate: 6.0

  it('spot-check Feb 2000 equity return', () => {
    const feb2000 = historicalData.find(d => d.year === 2000 && d.month === 2)!
    const expected = (2989.429931640625 / 2975.8701171875 - 1) + 3.5 / 100 / 12
    expect(feb2000.equityReturn).toBeCloseTo(expected, 6)
  })

  it('spot-check Feb 2000 bond return', () => {
    const feb2000 = historicalData.find(d => d.year === 2000 && d.month === 2)!
    const expected = 5.6347 / 100 / 12 + (-8 * (5.6347 - 5.8227) / 100)
    expect(feb2000.bondReturn).toBeCloseTo(expected, 6)
  })

  it('spot-check Feb 2000 cash return', () => {
    const feb2000 = historicalData.find(d => d.year === 2000 && d.month === 2)!
    expect(feb2000.cashReturn).toBeCloseTo((6.0 - 0.5) / 100 / 12, 6)
  })

  it('spot-check Feb 2000 inflation', () => {
    const feb2000 = historicalData.find(d => d.year === 2000 && d.month === 2)!
    expect(feb2000.inflationRate).toBeCloseTo(72.7999999999999972 / 72.5999999999999943 - 1, 6)
  })

  it('all equity returns within plausible range (-30% to +30%)', () => {
    for (const d of historicalData) {
      expect(d.equityReturn).toBeGreaterThan(-0.30)
      expect(d.equityReturn).toBeLessThan(0.30)
    }
  })

  it('all bond returns within plausible range (-15% to +15%)', () => {
    for (const d of historicalData) {
      expect(d.bondReturn).toBeGreaterThan(-0.15)
      expect(d.bondReturn).toBeLessThan(0.15)
    }
  })

  it('all cash returns non-negative and below 2%/month', () => {
    for (const d of historicalData) {
      expect(d.cashReturn).toBeGreaterThanOrEqual(0)
      expect(d.cashReturn).toBeLessThan(0.02)
    }
  })

  it('all inflation rates within plausible range (-3% to +5%)', () => {
    for (const d of historicalData) {
      expect(d.inflationRate).toBeGreaterThan(-0.03)
      expect(d.inflationRate).toBeLessThan(0.05)
    }
  })
})
