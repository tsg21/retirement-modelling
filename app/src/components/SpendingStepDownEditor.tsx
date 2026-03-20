import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import type { SpendingStepDown } from '../types'

interface SpendingStepDownEditorProps {
  steps: SpendingStepDown[]
  onChange: (steps: SpendingStepDown[]) => void
}

export function SpendingStepDownEditor({ steps, onChange }: SpendingStepDownEditorProps) {
  return (
    <div className="space-y-1">
      <Label className="text-sm font-medium">Spending step-downs</Label>
      {steps.map((step, i) => (
        <div key={i} className="flex items-center gap-2 rounded border border-border px-2 py-1">
          <span className="text-xs text-muted-foreground">From age</span>
          <Input
            type="number"
            value={step.age}
            onChange={e => {
              const newSteps = [...steps]
              newSteps[i] = { ...step, age: Number(e.target.value) }
              onChange(newSteps)
            }}
            className="h-7 w-16"
          />
          <span className="text-xs text-muted-foreground">£</span>
          <Input
            type="number"
            value={step.amount}
            onChange={e => {
              const newSteps = [...steps]
              newSteps[i] = { ...step, amount: Number(e.target.value) }
              onChange(newSteps)
            }}
            className="h-7 w-24"
          />
          <button
            className="text-sm text-muted-foreground hover:text-destructive"
            onClick={() => {
              onChange(steps.filter((_, j) => j !== i))
            }}
          >
            ✕
          </button>
        </div>
      ))}
      <button
        className="text-sm text-primary hover:underline"
        onClick={() =>
          onChange([
            ...steps,
            { age: 75, amount: 20000 } as SpendingStepDown,
          ])
        }
      >
        + Add step-down
      </button>
    </div>
  )
}
