import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { NumberField } from './NumberField'
import {
  currentBalanceFields,
  incomeAndSavingsFields,
  statePensionFields,
  type PersonNumberFieldConfig,
} from './personInputFields'
import type { PersonInputs } from '../types'

interface PersonInputSectionProps {
  label: string
  person: PersonInputs
  onChange: <K extends keyof PersonInputs>(key: K, value: PersonInputs[K]) => void
}

function renderPersonNumberFields(
  fields: PersonNumberFieldConfig[],
  person: PersonInputs,
  onChange: <K extends keyof PersonInputs>(key: K, value: PersonInputs[K]) => void
) {
  return fields.map(field => (
    <NumberField
      key={field.key}
      label={field.label}
      value={field.value ? field.value(person) : (person[field.key] as number)}
      onChange={v => onChange(field.key, v as PersonInputs[typeof field.key])}
      prefix={field.prefix}
      suffix={field.suffix}
      min={field.min}
      max={field.max}
      step={field.step}
    />
  ))
}

function RetirementAgeField({
  currentAge,
  retirementAge,
  onChange,
}: {
  currentAge: number
  retirementAge: number
  onChange: (value: number) => void
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">Target retirement age</Label>
      <div className="flex items-center gap-3">
        <Slider
          value={[retirementAge]}
          onValueChange={([v]) => onChange(v)}
          min={currentAge + 1}
          max={80}
          step={1}
          className="flex-1"
        />
        <Input
          type="number"
          value={retirementAge}
          onChange={e => onChange(Number(e.target.value))}
          className="h-8 w-16"
          min={currentAge + 1}
          max={80}
        />
      </div>
    </div>
  )
}

export function PersonInputSection({ label, person, onChange }: PersonInputSectionProps) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-foreground border-b border-border pb-1">{label}</div>

      <NumberField
        label="Current age"
        value={person.currentAge}
        onChange={v => onChange('currentAge', v)}
        min={18}
        max={80}
      />
      <RetirementAgeField
        currentAge={person.currentAge}
        retirementAge={person.retirementAge}
        onChange={v => onChange('retirementAge', v)}
      />

      {renderPersonNumberFields(incomeAndSavingsFields, person, onChange)}

      <div className="pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground mb-2">Current balances</div>
        <div className="space-y-3">{renderPersonNumberFields(currentBalanceFields, person, onChange)}</div>
      </div>

      <div className="pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground mb-2">State pension</div>
        <div className="space-y-3">{renderPersonNumberFields(statePensionFields, person, onChange)}</div>
      </div>
    </div>
  )
}

export { RetirementAgeField }
