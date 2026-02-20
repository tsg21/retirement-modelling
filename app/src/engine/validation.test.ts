import { describe, it, expect } from 'vitest'
import { validateInputs } from './validation'
import { DEFAULT_INPUTS } from '@/types'
import type { Inputs } from '@/types'

function inputsWith(overrides: Partial<Inputs>): Inputs {
  return { ...DEFAULT_INPUTS, ...overrides }
}

describe('validateInputs', () => {
  it('returns no warnings for default inputs', () => {
    expect(validateInputs(DEFAULT_INPUTS)).toEqual([])
  })

  describe('age validations', () => {
    it('warns if currentAge < 18', () => {
      const warnings = validateInputs(inputsWith({ currentAge: 15 }))
      expect(warnings).toContainEqual(
        expect.objectContaining({ type: 'input_validation', message: expect.stringContaining('18') }),
      )
    })

    it('warns if currentAge > 100', () => {
      const warnings = validateInputs(inputsWith({ currentAge: 105 }))
      expect(warnings).toContainEqual(
        expect.objectContaining({ type: 'input_validation', message: expect.stringContaining('100') }),
      )
    })

    it('warns if retirementAge <= currentAge', () => {
      const warnings = validateInputs(inputsWith({ currentAge: 60, retirementAge: 60 }))
      expect(warnings).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('Retirement age must be after current age') }),
      )
    })

    it('warns if longevity <= retirementAge', () => {
      const warnings = validateInputs(inputsWith({ retirementAge: 65, longevity: 65 }))
      expect(warnings).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('Longevity must be after retirement age') }),
      )
    })

    it('warns if retirement before min pension age and SIPP drawn first', () => {
      const warnings = validateInputs(
        inputsWith({
          retirementAge: 50,
          minPensionAge: 57,
          drawdownOrder: ['SIPP', 'ISA', 'Cash'],
        }),
      )
      expect(warnings).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('minimum pension access age') }),
      )
    })

    it('does NOT warn about min pension age when SIPP is not first', () => {
      const warnings = validateInputs(
        inputsWith({
          retirementAge: 50,
          minPensionAge: 57,
          drawdownOrder: ['Cash', 'ISA', 'SIPP'],
        }),
      )
      expect(warnings.find(w => w.message.includes('minimum pension'))).toBeUndefined()
    })
  })

  describe('monetary validations', () => {
    it('warns if salary is negative', () => {
      const warnings = validateInputs(inputsWith({ salary: -1000 }))
      expect(warnings).toContainEqual(
        expect.objectContaining({ message: 'Salary cannot be negative' }),
      )
    })

    it('warns if annual spending is negative', () => {
      const warnings = validateInputs(inputsWith({ annualSpending: -500 }))
      expect(warnings).toContainEqual(
        expect.objectContaining({ message: 'Annual spending cannot be negative' }),
      )
    })

    it('warns if monthly ISA is negative', () => {
      const warnings = validateInputs(inputsWith({ monthlyISA: -100 }))
      expect(warnings).toContainEqual(
        expect.objectContaining({ message: 'Monthly ISA contribution cannot be negative' }),
      )
    })

    it('warns if any balance is negative', () => {
      const warnings = validateInputs(inputsWith({ sippBalance: -1 }))
      expect(warnings).toContainEqual(
        expect.objectContaining({ message: 'Account balances cannot be negative' }),
      )
    })
  })

  describe('percentage validations', () => {
    it('warns if equity allocation > 100%', () => {
      const warnings = validateInputs(inputsWith({ stockBondSplitPct: 110 }))
      expect(warnings).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('Equity allocation') }),
      )
    })

    it('warns if total pension contributions > 100%', () => {
      const warnings = validateInputs(
        inputsWith({ employeePensionPct: 60, employerPensionPct: 50 }),
      )
      expect(warnings).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('Total pension contributions exceed 100%') }),
      )
    })
  })

  describe('spending step-down validations', () => {
    it('warns if step-down age is before retirement', () => {
      const warnings = validateInputs(
        inputsWith({
          retirementAge: 60,
          spendingStepDowns: [{ age: 55, amount: 20000 }],
        }),
      )
      expect(warnings).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('before or at retirement') }),
      )
    })

    it('warns if step-down amount is negative', () => {
      const warnings = validateInputs(
        inputsWith({
          spendingStepDowns: [{ age: 80, amount: -5000 }],
        }),
      )
      expect(warnings).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('negative amount') }),
      )
    })
  })

  describe('one-off expense validations', () => {
    it('warns if expense amount is negative', () => {
      const warnings = validateInputs(
        inputsWith({
          oneOffExpenses: [{ year: 2030, amount: -1000 }],
        }),
      )
      expect(warnings).toContainEqual(
        expect.objectContaining({ message: expect.stringContaining('negative amount') }),
      )
    })
  })
})
