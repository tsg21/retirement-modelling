import type { PersonInputs } from '../types'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'

interface PersonInputSectionProps {
  label: string
  person: PersonInputs
  onChange: <K extends keyof PersonInputs>(key: K, value: PersonInputs[K]) => void
}

function NumberField({
  label,
  value,
  onChange,
  prefix,
  suffix,
  min,
  max,
  step,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  prefix?: string
  suffix?: string
  min?: number
  max?: number
  step?: number
}) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">{label}</Label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          className="h-8"
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  )
}

export function PersonInputSection({ label, person, onChange }: PersonInputSectionProps) {
  return (
    <div className="space-y-3">
      <div className="text-sm font-semibold text-foreground border-b border-border pb-1">
        {label}
      </div>

      {/* Age inputs */}
      <NumberField
        label="Current age"
        value={person.currentAge}
        onChange={v => onChange('currentAge', v)}
        min={18}
        max={80}
      />
      <div className="space-y-1">
        <Label className="text-sm font-medium">Target retirement age</Label>
        <div className="flex items-center gap-3">
          <Slider
            value={[person.retirementAge]}
            onValueChange={([v]) => onChange('retirementAge', v)}
            min={person.currentAge + 1}
            max={80}
            step={1}
            className="flex-1"
          />
          <Input
            type="number"
            value={person.retirementAge}
            onChange={e => onChange('retirementAge', Number(e.target.value))}
            className="h-8 w-16"
            min={person.currentAge + 1}
            max={80}
          />
        </div>
      </div>

      {/* Income inputs */}
      <NumberField
        label="Current salary"
        value={person.salary}
        onChange={v => onChange('salary', v)}
        prefix="£"
        step={1000}
      />
      <NumberField
        label="Employee pension contribution"
        value={person.employeePensionPct}
        onChange={v => onChange('employeePensionPct', v)}
        suffix="%"
        min={0}
        max={100}
      />
      <NumberField
        label="Employer pension contribution"
        value={person.employerPensionPct}
        onChange={v => onChange('employerPensionPct', v)}
        suffix="%"
        min={0}
        max={100}
      />
      <NumberField
        label="Monthly ISA contribution"
        value={person.monthlyISA}
        onChange={v => onChange('monthlyISA', v)}
        prefix="£"
        step={50}
      />
      <NumberField
        label="S&S ISA split"
        value={person.ssISASplitPct}
        onChange={v => onChange('ssISASplitPct', v)}
        suffix="% S&S"
        min={0}
        max={100}
      />
      <NumberField
        label="Salary growth"
        value={person.salaryGrowthPct}
        onChange={v => onChange('salaryGrowthPct', v)}
        suffix="%"
        step={0.5}
      />

      {/* Balance inputs */}
      <div className="pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground mb-2">Current balances</div>
        <div className="space-y-3">
          <NumberField
            label="SIPP"
            value={person.sippBalance}
            onChange={v => onChange('sippBalance', v)}
            prefix="£"
            step={1000}
          />
          <NumberField
            label="Stocks & Shares ISA"
            value={person.ssISABalance}
            onChange={v => onChange('ssISABalance', v)}
            prefix="£"
            step={1000}
          />
          <NumberField
            label="Cash ISA"
            value={person.cashISABalance}
            onChange={v => onChange('cashISABalance', v)}
            prefix="£"
            step={1000}
          />
          <NumberField
            label="Cash Savings"
            value={person.cashSavingsBalance}
            onChange={v => onChange('cashSavingsBalance', v)}
            prefix="£"
            step={1000}
          />
          <NumberField
            label="SIPP & S&S ISA equities allocation"
            value={person.stockBondSplitPct}
            onChange={v => onChange('stockBondSplitPct', v)}
            suffix="% equities"
            min={0}
            max={100}
          />
        </div>
      </div>

      {/* State pension inputs */}
      <div className="pt-2 border-t border-border">
        <div className="text-xs text-muted-foreground mb-2">State pension</div>
        <div className="space-y-3">
          <NumberField
            label="State pension (annual)"
            value={person.statePensionOverride ?? person.statePensionAmount}
            onChange={v => onChange('statePensionOverride', v)}
            prefix="£"
            step={100}
          />
          <NumberField
            label="State pension age"
            value={person.statePensionAge}
            onChange={v => onChange('statePensionAge', v)}
            min={60}
            max={75}
          />
          <NumberField
            label="Minimum pension access age"
            value={person.minPensionAge}
            onChange={v => onChange('minPensionAge', v)}
            min={55}
            max={60}
          />
        </div>
      </div>
    </div>
  )
}
