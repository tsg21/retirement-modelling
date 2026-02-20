import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Slider } from '@/components/ui/slider'
import type { Inputs, DrawdownCategory, SpendingStepDown, OneOffExpense } from '../types'

interface InputPanelProps {
  inputs: Inputs
  onChange: (inputs: Inputs) => void
  onReset: () => void
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

export function InputPanel({ inputs, onChange, onReset }: InputPanelProps) {
  const update = <K extends keyof Inputs>(key: K, value: Inputs[K]) => {
    onChange({ ...inputs, [key]: value })
  }

  return (
    <div className="space-y-0">
      {/* Section 1: The Basics */}
      <Section title="The Basics">
        <NumberField
          label="Current age"
          value={inputs.currentAge}
          onChange={v => update('currentAge', v)}
          min={18}
          max={80}
        />
        <div className="space-y-1">
          <Label className="text-sm font-medium">Target retirement age</Label>
          <div className="flex items-center gap-3">
            <Slider
              value={[inputs.retirementAge]}
              onValueChange={([v]) => update('retirementAge', v)}
              min={inputs.currentAge + 1}
              max={80}
              step={1}
              className="flex-1"
            />
            <Input
              type="number"
              value={inputs.retirementAge}
              onChange={e => update('retirementAge', Number(e.target.value))}
              className="h-8 w-16"
              min={inputs.currentAge + 1}
              max={80}
            />
          </div>
        </div>
        <NumberField
          label="Annual spending in retirement"
          value={inputs.annualSpending}
          onChange={v => update('annualSpending', v)}
          prefix="£"
          step={1000}
        />
      </Section>

      {/* Section 2: Income & Savings */}
      <Section title="Income & Savings">
        <NumberField
          label="Current salary"
          value={inputs.salary}
          onChange={v => update('salary', v)}
          prefix="£"
          step={1000}
        />
        <NumberField
          label="Employee pension contribution"
          value={inputs.employeePensionPct}
          onChange={v => update('employeePensionPct', v)}
          suffix="%"
          min={0}
          max={100}
        />
        <NumberField
          label="Employer pension contribution"
          value={inputs.employerPensionPct}
          onChange={v => update('employerPensionPct', v)}
          suffix="%"
          min={0}
          max={100}
        />
        <NumberField
          label="Monthly ISA contribution"
          value={inputs.monthlyISA}
          onChange={v => update('monthlyISA', v)}
          prefix="£"
          step={50}
        />
        <NumberField
          label="S&S ISA split"
          value={inputs.ssISASplitPct}
          onChange={v => update('ssISASplitPct', v)}
          suffix="% S&S"
          min={0}
          max={100}
        />
        <NumberField
          label="Salary growth"
          value={inputs.salaryGrowthPct}
          onChange={v => update('salaryGrowthPct', v)}
          suffix="%"
          step={0.5}
        />
      </Section>

      {/* Section 3: Current Balances */}
      <Section title="Current Balances">
        <NumberField
          label="SIPP"
          value={inputs.sippBalance}
          onChange={v => update('sippBalance', v)}
          prefix="£"
          step={1000}
        />
        <NumberField
          label="Stocks & Shares ISA"
          value={inputs.ssISABalance}
          onChange={v => update('ssISABalance', v)}
          prefix="£"
          step={1000}
        />
        <NumberField
          label="Cash ISA"
          value={inputs.cashISABalance}
          onChange={v => update('cashISABalance', v)}
          prefix="£"
          step={1000}
        />
        <NumberField
          label="Cash Savings"
          value={inputs.cashSavingsBalance}
          onChange={v => update('cashSavingsBalance', v)}
          prefix="£"
          step={1000}
        />
        <NumberField
          label="SIPP & S&S ISA equities allocation"
          value={inputs.stockBondSplitPct}
          onChange={v => update('stockBondSplitPct', v)}
          suffix="% equities"
          min={0}
          max={100}
        />
      </Section>

      {/* Section 4: Advanced */}
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
                    update('drawdownOrder', order)
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
                    update('drawdownOrder', order)
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
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">From age</span>
              <Input
                type="number"
                value={step.age}
                onChange={e => {
                  const steps = [...inputs.spendingStepDowns]
                  steps[i] = { ...step, age: Number(e.target.value) }
                  update('spendingStepDowns', steps)
                }}
                className="h-8 w-16"
              />
              <span className="text-sm text-muted-foreground">£</span>
              <Input
                type="number"
                value={step.amount}
                onChange={e => {
                  const steps = [...inputs.spendingStepDowns]
                  steps[i] = { ...step, amount: Number(e.target.value) }
                  update('spendingStepDowns', steps)
                }}
                className="h-8 w-24"
              />
              <button
                className="text-sm text-muted-foreground hover:text-destructive"
                onClick={() => {
                  update('spendingStepDowns', inputs.spendingStepDowns.filter((_, j) => j !== i))
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="text-sm text-primary hover:underline"
            onClick={() =>
              update('spendingStepDowns', [
                ...inputs.spendingStepDowns,
                { age: 80, amount: 25000 } as SpendingStepDown,
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
            <div key={i} className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Year</span>
              <Input
                type="number"
                value={expense.year}
                onChange={e => {
                  const expenses = [...inputs.oneOffExpenses]
                  expenses[i] = { ...expense, year: Number(e.target.value) }
                  update('oneOffExpenses', expenses)
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
                  update('oneOffExpenses', expenses)
                }}
                className="h-8 w-24"
              />
              <button
                className="text-sm text-muted-foreground hover:text-destructive"
                onClick={() => {
                  update('oneOffExpenses', inputs.oneOffExpenses.filter((_, j) => j !== i))
                }}
              >
                ✕
              </button>
            </div>
          ))}
          <button
            className="text-sm text-primary hover:underline"
            onClick={() =>
              update('oneOffExpenses', [
                ...inputs.oneOffExpenses,
                { year: new Date().getFullYear() + 5, amount: 20000 } as OneOffExpense,
              ])
            }
          >
            + Add expense
          </button>
        </div>

      </Section>

      {/* Section 5: Assumptions */}
      <Section title="Assumptions" defaultOpen={false}>
        <NumberField
          label="State pension (annual)"
          value={inputs.statePensionOverride ?? inputs.statePensionAmount}
          onChange={v => update('statePensionOverride', v)}
          prefix="£"
          step={100}
        />
        <NumberField
          label="Inflation"
          value={inputs.inflationPct}
          onChange={v => update('inflationPct', v)}
          suffix="%"
          step={0.5}
        />
        <NumberField
          label="Equity growth"
          value={inputs.equityGrowthPct}
          onChange={v => update('equityGrowthPct', v)}
          suffix="%"
          step={0.5}
        />
        <NumberField
          label="Bond income rate"
          value={inputs.bondRatePct}
          onChange={v => update('bondRatePct', v)}
          suffix="%"
          step={0.5}
        />
        <NumberField
          label="Cash interest rate"
          value={inputs.cashRatePct}
          onChange={v => update('cashRatePct', v)}
          suffix="%"
          step={0.5}
        />
        <NumberField
          label="State pension age"
          value={inputs.statePensionAge}
          onChange={v => update('statePensionAge', v)}
          min={60}
          max={75}
        />
        <NumberField
          label="Minimum pension access age"
          value={inputs.minPensionAge}
          onChange={v => update('minPensionAge', v)}
          min={55}
          max={60}
        />
        <NumberField
          label="Longevity (plan to age)"
          value={inputs.longevity}
          onChange={v => update('longevity', v)}
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
