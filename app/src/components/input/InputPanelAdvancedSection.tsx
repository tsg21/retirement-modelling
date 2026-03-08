import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { OwnerTieBreakSelector } from '@/components/OwnerTieBreakSelector'
import type { DrawdownCategory, Inputs, OneOffExpense, SpendingStepDown } from '@/types'

interface Props {
  inputs: Inputs
  updateShared: <K extends keyof Inputs>(key: K, value: Inputs[K]) => void
  onChange: (inputs: Inputs) => void
}

export function InputPanelAdvancedSection({ inputs, updateShared, onChange }: Props) {
  return (
    <>
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
    </>
  )
}
