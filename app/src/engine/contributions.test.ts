import { describe, it, expect } from 'vitest'
import { computeMonthlyContributions } from './contributions'

describe('computeMonthlyContributions', () => {
  const baseInputs = {
    salary: 65_000,
    employeePensionPct: 10,
    employerPensionPct: 5,
    monthlyISA: 500,
    ssISASplitPct: 80,
    stockBondSplitPct: 70,
  }

  it('computes correct SIPP contribution (employee + employer)', () => {
    const result = computeMonthlyContributions(baseInputs)
    // 15% of £65,000 / 12 = £812.50
    const expectedSIPP = 0.15 * 65_000 / 12
    expect(result.sipp.equities + result.sipp.bonds).toBeCloseTo(expectedSIPP)
  })

  it('splits SIPP between equities and bonds per allocation', () => {
    const result = computeMonthlyContributions(baseInputs)
    const totalSIPP = result.sipp.equities + result.sipp.bonds
    expect(result.sipp.equities / totalSIPP).toBeCloseTo(0.70)
    expect(result.sipp.bonds / totalSIPP).toBeCloseTo(0.30)
  })

  it('splits ISA between S&S ISA and Cash ISA', () => {
    const result = computeMonthlyContributions(baseInputs)
    const totalSsISA = result.ssISA.equities + result.ssISA.bonds
    expect(totalSsISA).toBeCloseTo(500 * 0.80)
    expect(result.cashISA).toBeCloseTo(500 * 0.20)
  })

  it('splits S&S ISA between equities and bonds', () => {
    const result = computeMonthlyContributions(baseInputs)
    const totalSsISA = result.ssISA.equities + result.ssISA.bonds
    expect(result.ssISA.equities / totalSsISA).toBeCloseTo(0.70)
  })

  it('total equals sum of all contributions', () => {
    const result = computeMonthlyContributions(baseInputs)
    const sippTotal = result.sipp.equities + result.sipp.bonds
    const isaTotal = result.ssISA.equities + result.ssISA.bonds + result.cashISA
    expect(result.total).toBeCloseTo(sippTotal + isaTotal)
  })

  it('handles 100% equities allocation', () => {
    const result = computeMonthlyContributions({ ...baseInputs, stockBondSplitPct: 100 })
    expect(result.sipp.bonds).toBe(0)
    expect(result.ssISA.bonds).toBe(0)
  })

  it('handles 0% S&S ISA split (all to Cash ISA)', () => {
    const result = computeMonthlyContributions({ ...baseInputs, ssISASplitPct: 0 })
    expect(result.ssISA.equities + result.ssISA.bonds).toBe(0)
    expect(result.cashISA).toBeCloseTo(500)
  })
})
