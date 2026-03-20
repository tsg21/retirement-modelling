import { HouseholdTypeToggle } from './HouseholdTypeToggle'
import { PersonInputSection, RetirementAgeField } from './PersonInputSection'
import { incomeAndSavingsFields, currentBalanceFields } from './personInputFields'
import { OwnerTieBreakSelector } from './OwnerTieBreakSelector'
import { NumberField } from './NumberField'
import { Section } from './Section'
import { DrawdownOrderEditor } from './DrawdownOrderEditor'
import { SpendingStepDownEditor } from './SpendingStepDownEditor'
import { OneOffExpenseEditor } from './OneOffExpenseEditor'
import { AssumptionsSection } from './AssumptionsSection'
import type { Inputs, PersonInputs } from '../types'
import { DEFAULT_INPUTS, DEFAULT_COUPLE_INPUTS } from '../types'

interface InputPanelProps {
  inputs: Inputs
  onChange: (inputs: Inputs) => void
  onReset: () => void
  backtestingMode: boolean
}

export function InputPanel({ inputs, onChange, onReset, backtestingMode }: InputPanelProps) {
  const handleHouseholdTypeChange = (newType: 'single' | 'marriedCouple') => {
    if (newType === inputs.householdType) return

    if (newType === 'marriedCouple') {
      // Convert single to couple: migrate current values to partner A, use defaults for partner B
      if (inputs.householdType === 'single') {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { householdType: _, ...personAndShared } = inputs
        const {
          currentAge,
          retirementAge,
          salary,
          employeePensionPct,
          employerPensionPct,
          monthlyISA,
          ssISASplitPct,
          salaryGrowthPct,
          sippBalance,
          ssISABalance,
          cashISABalance,
          cashSavingsBalance,
          stockBondSplitPct,
          statePensionAge,
          minPensionAge,
          statePensionAmount,
          statePensionOverride,
          ...shared
        } = personAndShared
        onChange({
          ...shared,
          householdType: 'marriedCouple',
          partnerA: {
            currentAge,
            retirementAge,
            salary,
            employeePensionPct,
            employerPensionPct,
            monthlyISA,
            ssISASplitPct,
            salaryGrowthPct,
            sippBalance,
            ssISABalance,
            cashISABalance,
            cashSavingsBalance,
            stockBondSplitPct,
            statePensionAge,
            minPensionAge,
            statePensionAmount,
            statePensionOverride,
          },
          partnerB: DEFAULT_COUPLE_INPUTS.partnerB,
          ownerTieBreak: 'proportional',
        })
      }
    } else {
      // Convert couple to single: use partner A values
      if (inputs.householdType === 'marriedCouple') {
        onChange({
          ...inputs,
          ...inputs.partnerA,
          householdType: 'single',
        } as Inputs)
      }
    }
  }

  // Single mode: direct update helpers
  const updateSingle = <K extends keyof PersonInputs | keyof typeof DEFAULT_INPUTS>(
    key: K,
    value: typeof DEFAULT_INPUTS[K & keyof typeof DEFAULT_INPUTS]
  ) => {
    if (inputs.householdType === 'single') {
      onChange({ ...inputs, [key]: value })
    }
  }

  // Couple mode: update helpers
  const updatePartnerA = <K extends keyof PersonInputs>(key: K, value: PersonInputs[K]) => {
    if (inputs.householdType === 'marriedCouple') {
      onChange({
        ...inputs,
        partnerA: { ...inputs.partnerA, [key]: value },
      })
    }
  }

  const updatePartnerB = <K extends keyof PersonInputs>(key: K, value: PersonInputs[K]) => {
    if (inputs.householdType === 'marriedCouple') {
      onChange({
        ...inputs,
        partnerB: { ...inputs.partnerB, [key]: value },
      })
    }
  }

  const updateShared = <K extends keyof Inputs>(key: K, value: Inputs[K]) => {
    onChange({ ...inputs, [key]: value })
  }

  return (
    <div className="space-y-0">
      {/* Household Type Toggle */}
      <div className="p-3 border-b border-border">
        <HouseholdTypeToggle value={inputs.householdType} onChange={handleHouseholdTypeChange} />
      </div>

      {/* Conditional rendering based on household type */}
      {inputs.householdType === 'single' ? (
        <>
          {/* Single Mode: The Basics */}
          <Section title="The Basics">
            <NumberField
              label="Current age"
              value={inputs.currentAge}
              onChange={v => updateSingle('currentAge', v)}
              min={18}
              max={80}
            />
            <RetirementAgeField
              currentAge={inputs.currentAge}
              retirementAge={inputs.retirementAge}
              onChange={v => updateSingle('retirementAge', v)}
            />
            <NumberField
              label="Annual spending in retirement"
              value={inputs.annualSpending}
              onChange={v => updateShared('annualSpending', v)}
              prefix="£"
              step={1000}
            />
          </Section>

          {/* Single Mode: Income & Savings */}
          <Section title="Income & Savings">
            {incomeAndSavingsFields.map(field => (
              <NumberField
                key={field.key}
                label={field.label}
                value={(field.value ? field.value(inputs) : inputs[field.key]) as number}
                onChange={v => updateSingle(field.key, v)}
                prefix={field.prefix}
                suffix={field.suffix}
                min={field.min}
                max={field.max}
                step={field.step}
              />
            ))}
          </Section>

          {/* Single Mode: Current Balances */}
          <Section title="Current Balances">
            {currentBalanceFields.map(field => (
              <NumberField
                key={field.key}
                label={field.label}
                value={(field.value ? field.value(inputs) : inputs[field.key]) as number}
                onChange={v => updateSingle(field.key, v)}
                prefix={field.prefix}
                suffix={field.suffix}
                min={field.min}
                max={field.max}
                step={field.step}
              />
            ))}
          </Section>
        </>
      ) : (
        <>
          {/* Couple Mode: The Basics */}
          <Section title="The Basics">
            <NumberField
              label="Annual household spending in retirement"
              value={inputs.annualSpending}
              onChange={v => updateShared('annualSpending', v)}
              prefix="£"
              step={1000}
            />
          </Section>

          {/* Couple Mode: Partner A */}
          <Section title="Partner A" defaultOpen={false}>
            <PersonInputSection
              label="Partner A"
              person={inputs.partnerA}
              onChange={updatePartnerA}
            />
          </Section>

          {/* Couple Mode: Partner B */}
          <Section title="Partner B" defaultOpen={false}>
            <PersonInputSection
              label="Partner B"
              person={inputs.partnerB}
              onChange={updatePartnerB}
            />
          </Section>
        </>
      )}

      {/* Shared sections for both modes */}
      <Section title="Advanced" defaultOpen={false}>
        <DrawdownOrderEditor
          order={inputs.drawdownOrder}
          onChange={order => updateShared('drawdownOrder', order)}
        />
        <SpendingStepDownEditor
          steps={inputs.spendingStepDowns}
          onChange={steps => updateShared('spendingStepDowns', steps)}
        />
        <OneOffExpenseEditor
          expenses={inputs.oneOffExpenses}
          onChange={expenses => updateShared('oneOffExpenses', expenses)}
        />

        {/* Owner tie-break (couple mode only) */}
        {inputs.householdType === 'marriedCouple' && (
          <OwnerTieBreakSelector
            value={inputs.ownerTieBreak}
            onChange={v => {
              if (inputs.householdType === 'marriedCouple') {
                onChange({ ...inputs, ownerTieBreak: v })
              }
            }}
          />
        )}
      </Section>

      {/* Assumptions */}
      <Section title="Assumptions" defaultOpen={false}>
        <AssumptionsSection
          inputs={inputs}
          backtestingMode={backtestingMode}
          onUpdateSingle={(key, value) => updateSingle(key as keyof PersonInputs, value)}
          onUpdateShared={updateShared}
        />
      </Section>

      {/* Reset to defaults */}
      <div className="pt-4 pb-2">
        <button
          className="w-full text-sm text-muted-foreground hover:text-foreground border border-border rounded-md px-3 py-1.5 transition-colors"
          onClick={() => {
            if (window.confirm('Reset all inputs to defaults? This cannot be undone.')) {
              onReset()
            }
          }}
        >
          Reset to defaults
        </button>
      </div>
    </div>
  )
}
