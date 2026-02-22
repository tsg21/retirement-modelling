import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import { HouseholdTypeToggle } from './HouseholdTypeToggle'
import { PersonInputSection } from './PersonInputSection'
import { OwnerTieBreakSelector } from './OwnerTieBreakSelector'
import type { Inputs, DrawdownCategory, SpendingStepDown, OneOffExpense, PersonInputs } from '../types'
import { DEFAULT_INPUTS, DEFAULT_COUPLE_INPUTS } from '../types'

interface InputPanelProps {
  inputs: Inputs
  onChange: (inputs: Inputs) => void
  onReset: () => void
  backtestingMode: boolean
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
  disabled,
}: {
  label: string
  value: number
  onChange: (v: number) => void
  prefix?: string
  suffix?: string
  min?: number
  max?: number
  step?: number
  disabled?: boolean
}) {
  return (
    <div className="space-y-1">
      <Label className={`text-sm font-medium ${disabled ? 'text-muted-foreground' : ''}`}>{label}</Label>
      <div className="flex items-center gap-1">
        {prefix && <span className="text-sm text-muted-foreground">{prefix}</span>}
        <Input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          className="h-8"
        />
        {suffix && <span className="text-sm text-muted-foreground">{suffix}</span>}
      </div>
    </div>
  )
}

function Section({
  title,
  defaultOpen = true,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b border-border">
      <CollapsibleTrigger className="flex w-full items-center justify-between py-3 px-1 text-sm font-semibold hover:bg-accent/50 rounded-sm transition-colors">
        {title}
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-1 pb-4 space-y-3">
        {children}
      </CollapsibleContent>
    </Collapsible>
  )
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
            <div className="space-y-1">
              <Label className="text-sm font-medium">Target retirement age</Label>
              <div className="flex items-center gap-3">
                <Slider
                  value={[inputs.retirementAge]}
                  onValueChange={([v]) => updateSingle('retirementAge', v)}
                  min={inputs.currentAge + 1}
                  max={80}
                  step={1}
                  className="flex-1"
                />
                <Input
                  type="number"
                  value={inputs.retirementAge}
                  onChange={e => updateSingle('retirementAge', Number(e.target.value))}
                  className="h-8 w-16"
                  min={inputs.currentAge + 1}
                  max={80}
                />
              </div>
            </div>
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
            <NumberField
              label="Current salary"
              value={inputs.salary}
              onChange={v => updateSingle('salary', v)}
              prefix="£"
              step={1000}
            />
            <NumberField
              label="Employee pension contribution"
              value={inputs.employeePensionPct}
              onChange={v => updateSingle('employeePensionPct', v)}
              suffix="%"
              min={0}
              max={100}
            />
            <NumberField
              label="Employer pension contribution"
              value={inputs.employerPensionPct}
              onChange={v => updateSingle('employerPensionPct', v)}
              suffix="%"
              min={0}
              max={100}
            />
            <NumberField
              label="Monthly ISA contribution"
              value={inputs.monthlyISA}
              onChange={v => updateSingle('monthlyISA', v)}
              prefix="£"
              step={50}
            />
            <NumberField
              label="S&S ISA split"
              value={inputs.ssISASplitPct}
              onChange={v => updateSingle('ssISASplitPct', v)}
              suffix="% S&S"
              min={0}
              max={100}
            />
            <NumberField
              label="Salary growth"
              value={inputs.salaryGrowthPct}
              onChange={v => updateSingle('salaryGrowthPct', v)}
              suffix="%"
              step={0.5}
            />
          </Section>

          {/* Single Mode: Current Balances */}
          <Section title="Current Balances">
            <NumberField
              label="SIPP"
              value={inputs.sippBalance}
              onChange={v => updateSingle('sippBalance', v)}
              prefix="£"
              step={1000}
            />
            <NumberField
              label="Stocks & Shares ISA"
              value={inputs.ssISABalance}
              onChange={v => updateSingle('ssISABalance', v)}
              prefix="£"
              step={1000}
            />
            <NumberField
              label="Cash ISA"
              value={inputs.cashISABalance}
              onChange={v => updateSingle('cashISABalance', v)}
              prefix="£"
              step={1000}
            />
            <NumberField
              label="Cash Savings"
              value={inputs.cashSavingsBalance}
              onChange={v => updateSingle('cashSavingsBalance', v)}
              prefix="£"
              step={1000}
            />
            <NumberField
              label="SIPP & S&S ISA equities allocation"
              value={inputs.stockBondSplitPct}
              onChange={v => updateSingle('stockBondSplitPct', v)}
              suffix="% equities"
              min={0}
              max={100}
            />
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
        {/* Drawdown order */}
        <div className="space-y-1">
          <Label className="text-sm font-medium">Drawdown order</Label>
          <div className="space-y-1">
            {inputs.drawdownOrder.map((cat, i) => (
              <div key={cat} className="flex items-center gap-2 rounded border border-border px-3 py-1.5 text-sm">
                <span className="text-muted-foreground">{i + 1}.</span>
                <span className="flex-1">{cat}</span>
                <button
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={i === 0}
                  onClick={() => {
                    const order = [...inputs.drawdownOrder] as DrawdownCategory[]
                    ;[order[i - 1], order[i]] = [order[i], order[i - 1]]
                    updateShared('drawdownOrder', order)
                  }}
                >
                  ↑
                </button>
                <button
                  className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                  disabled={i === inputs.drawdownOrder.length - 1}
                  onClick={() => {
                    const order = [...inputs.drawdownOrder] as DrawdownCategory[]
                    ;[order[i], order[i + 1]] = [order[i + 1], order[i]]
                    updateShared('drawdownOrder', order)
                  }}
                >
                  ↓
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Spending step-downs */}
        <div className="space-y-1">
          <Label className="text-sm font-medium">Spending step-downs</Label>
          {inputs.spendingStepDowns.map((step, i) => (
            <div key={i} className="flex items-center gap-2 rounded border border-border px-2 py-1">
              <span className="text-xs text-muted-foreground">From age</span>
              <Input
                type="number"
                value={step.age}
                onChange={e => {
                  const steps = [...inputs.spendingStepDowns]
                  steps[i] = { ...step, age: Number(e.target.value) }
                  updateShared('spendingStepDowns', steps)
                }}
                className="h-7 w-16"
              />
              <span className="text-xs text-muted-foreground">£</span>
              <Input
                type="number"
                value={step.amount}
                onChange={e => {
                  const steps = [...inputs.spendingStepDowns]
                  steps[i] = { ...step, amount: Number(e.target.value) }
                  updateShared('spendingStepDowns', steps)
                }}
                className="h-7 w-24"
              />
              <button
                className="text-sm text-muted-foreground hover:text-destructive"
                onClick={() => {
                  updateShared('spendingStepDowns', inputs.spendingStepDowns.filter((_, j) => j !== i))
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="text-sm text-primary hover:underline"
            onClick={() =>
              updateShared('spendingStepDowns', [
                ...inputs.spendingStepDowns,
                { age: 75, amount: 20000 } as SpendingStepDown,
              ])
            }
          >
            + Add step-down
          </button>
        </div>

        {/* One-off expenses */}
        <div className="space-y-1">
          <Label className="text-sm font-medium">One-off expenses</Label>
          {inputs.oneOffExpenses.map((expense, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center gap-2 rounded border border-border px-2 py-1">
                <span className="text-xs text-muted-foreground">Year</span>
                <Input
                  type="number"
                  value={expense.year}
                  onChange={e => {
                    const expenses = [...inputs.oneOffExpenses]
                    expenses[i] = { ...expense, year: Number(e.target.value) }
                    updateShared('oneOffExpenses', expenses)
                  }}
                  className="h-8 w-20"
                />
                <span className="text-sm text-muted-foreground">£</span>
                <Input
                  type="number"
                  value={expense.amount}
                  onChange={e => {
                    const expenses = [...inputs.oneOffExpenses]
                    expenses[i] = { ...expense, amount: Number(e.target.value) }
                    updateShared('oneOffExpenses', expenses)
                  }}
                  className="h-8 w-24"
                />
                <button
                  className="text-sm text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    updateShared('oneOffExpenses', inputs.oneOffExpenses.filter((_, j) => j !== i))
                  }}
                >
                  ✕
                </button>
              </div>
              <Input
                type="text"
                placeholder="Description (optional)"
                value={expense.description ?? ''}
                onChange={e => {
                  const expenses = [...inputs.oneOffExpenses]
                  expenses[i] = { ...expense, description: e.target.value || undefined }
                  updateShared('oneOffExpenses', expenses)
                }}
                className="h-7 text-xs"
              />
            </div>
          ))}
          <button
            className="text-sm text-primary hover:underline"
            onClick={() =>
              updateShared('oneOffExpenses', [
                ...inputs.oneOffExpenses,
                { year: new Date().getFullYear() + 5, amount: 20000 } as OneOffExpense,
              ])
            }
          >
            + Add expense
          </button>
        </div>

        {/* Owner tie-break (couple mode only) */}
        {inputs.householdType === 'marriedCouple' && (
          <OwnerTieBreakSelector
            value={inputs.ownerTieBreak}
            onChange={v => {
              if (inputs.householdType === 'marriedCouple') {
                updateShared('ownerTieBreak', v)
              }
            }}
          />
        )}
      </Section>

      {/* Assumptions */}
      <Section title="Assumptions" defaultOpen={false}>
        {backtestingMode && (
          <div className="p-2 rounded bg-muted text-xs text-muted-foreground mb-2">
            Historical data is being used for inflation and growth rates. The fields below are used when historical data runs out.
          </div>
        )}
        {inputs.householdType === 'single' && (
          <>
            <NumberField
              label="State pension (annual)"
              value={inputs.statePensionOverride ?? inputs.statePensionAmount}
              onChange={v => updateSingle('statePensionOverride', v)}
              prefix="£"
              step={100}
            />
            <NumberField
              label="State pension age"
              value={inputs.statePensionAge}
              onChange={v => updateSingle('statePensionAge', v)}
              min={60}
              max={75}
            />
            <NumberField
              label="Minimum pension access age"
              value={inputs.minPensionAge}
              onChange={v => updateSingle('minPensionAge', v)}
              min={55}
              max={60}
            />
          </>
        )}
        <NumberField
          label="Inflation"
          value={inputs.inflationPct}
          onChange={v => updateShared('inflationPct', v)}
          suffix="%"
          step={0.5}
          disabled={backtestingMode}
        />
        <NumberField
          label="Equity growth"
          value={inputs.equityGrowthPct}
          onChange={v => updateShared('equityGrowthPct', v)}
          suffix="%"
          step={0.5}
          disabled={backtestingMode}
        />
        <NumberField
          label="Bond income rate"
          value={inputs.bondRatePct}
          onChange={v => updateShared('bondRatePct', v)}
          suffix="%"
          step={0.5}
          disabled={backtestingMode}
        />
        <NumberField
          label="Cash interest rate"
          value={inputs.cashRatePct}
          onChange={v => updateShared('cashRatePct', v)}
          suffix="%"
          step={0.5}
          disabled={backtestingMode}
        />
        <NumberField
          label="Longevity (plan to age)"
          value={inputs.longevity}
          onChange={v => updateShared('longevity', v)}
          min={70}
          max={110}
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
