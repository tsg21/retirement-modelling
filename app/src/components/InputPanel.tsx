import { HouseholdTypeToggle } from './HouseholdTypeToggle'
import { NumberField } from './NumberField'
import { PersonInputSection, RetirementAgeField } from './PersonInputSection'
import { currentBalanceFields, incomeAndSavingsFields } from './personInputFields'
import { CollapsibleSection } from './input/CollapsibleSection'
import { InputPanelAdvancedSection } from './input/InputPanelAdvancedSection'
import { InputPanelAssumptionsSection } from './input/InputPanelAssumptionsSection'
import { useInputPanelHandlers } from './input/useInputPanelHandlers'
import type { Inputs } from '../types'

interface InputPanelProps {
  inputs: Inputs
  onChange: (inputs: Inputs) => void
  onReset: () => void
  backtestingMode: boolean
}

export function InputPanel({ inputs, onChange, onReset, backtestingMode }: InputPanelProps) {
  const { handleHouseholdTypeChange, updateSingle, updatePartnerA, updatePartnerB, updateShared } =
    useInputPanelHandlers(inputs, onChange)

  return (
    <div className="space-y-0">
      <div className="p-3 border-b border-border">
        <HouseholdTypeToggle value={inputs.householdType} onChange={handleHouseholdTypeChange} />
      </div>

      {inputs.householdType === 'single' ? (
        <>
          <CollapsibleSection title="The Basics">
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
          </CollapsibleSection>

          <CollapsibleSection title="Income & Savings">
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
          </CollapsibleSection>

          <CollapsibleSection title="Current Balances">
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
          </CollapsibleSection>
        </>
      ) : (
        <>
          <CollapsibleSection title="The Basics">
            <NumberField
              label="Annual household spending in retirement"
              value={inputs.annualSpending}
              onChange={v => updateShared('annualSpending', v)}
              prefix="£"
              step={1000}
            />
          </CollapsibleSection>

          <CollapsibleSection title="Partner A" defaultOpen={false}>
            <PersonInputSection label="Partner A" person={inputs.partnerA} onChange={updatePartnerA} />
          </CollapsibleSection>

          <CollapsibleSection title="Partner B" defaultOpen={false}>
            <PersonInputSection label="Partner B" person={inputs.partnerB} onChange={updatePartnerB} />
          </CollapsibleSection>
        </>
      )}

      <CollapsibleSection title="Advanced" defaultOpen={false}>
        <InputPanelAdvancedSection inputs={inputs} updateShared={updateShared} onChange={onChange} />
      </CollapsibleSection>

      <CollapsibleSection title="Assumptions" defaultOpen={false}>
        <InputPanelAssumptionsSection
          inputs={inputs}
          backtestingMode={backtestingMode}
          updateSingle={updateSingle}
          updateShared={updateShared}
        />
      </CollapsibleSection>

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
