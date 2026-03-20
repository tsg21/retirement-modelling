import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { OneOffExpense } from '../types'

interface OneOffExpenseEditorProps {
  expenses: OneOffExpense[]
  onChange: (expenses: OneOffExpense[]) => void
}

export function OneOffExpenseEditor({ expenses, onChange }: OneOffExpenseEditorProps) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">One-off expenses</Label>
      {expenses.map((expense, i) => (
        <div key={i} className="space-y-1">
          <div className="flex items-center gap-2 rounded border border-border px-2 py-1">
            <span className="text-xs text-muted-foreground">Year</span>
            <Input
              type="number"
              value={expense.year}
              onChange={e => {
                const newExpenses = [...expenses]
                newExpenses[i] = { ...expense, year: Number(e.target.value) }
                onChange(newExpenses)
              }}
              className="h-8 w-20"
            />
            <span className="text-sm text-muted-foreground">£</span>
            <Input
              type="number"
              value={expense.amount}
              onChange={e => {
                const newExpenses = [...expenses]
                newExpenses[i] = { ...expense, amount: Number(e.target.value) }
                onChange(newExpenses)
              }}
              className="h-8 w-24"
            />
            <button
              className="text-sm text-muted-foreground hover:text-destructive"
              onClick={() => {
                onChange(expenses.filter((_, j) => j !== i))
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
              const newExpenses = [...expenses]
              newExpenses[i] = { ...expense, description: e.target.value || undefined }
              onChange(newExpenses)
            }}
            className="h-7 text-xs"
          />
        </div>
      ))}
      <button
        className="text-sm text-primary hover:underline"
        onClick={() =>
          onChange([
            ...expenses,
            { year: new Date().getFullYear() + 5, amount: 20000 } as OneOffExpense,
          ])
        }
      >
        + Add expense
      </button>
    </div>
  )
}
