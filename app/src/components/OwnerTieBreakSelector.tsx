import type { OwnerTieBreak } from '../types'
import { Label } from '@/components/ui/label'

interface OwnerTieBreakSelectorProps {
  value: OwnerTieBreak
  onChange: (value: OwnerTieBreak) => void
}

export function OwnerTieBreakSelector({ value, onChange }: OwnerTieBreakSelectorProps) {
  const options: { value: OwnerTieBreak; label: string; description: string }[] = [
    {
      value: 'A-first',
      label: 'Partner A first',
      description: 'Draw from Partner A accounts before Partner B',
    },
    {
      value: 'B-first',
      label: 'Partner B first',
      description: 'Draw from Partner B accounts before Partner A',
    },
    {
      value: 'proportional',
      label: 'Proportional',
      description: 'Draw from both partners proportionally to their balances',
    },
  ]

  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium">Drawdown tie-break</Label>
      <div className="space-y-2">
        {options.map(option => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`w-full text-left p-3 rounded-lg border transition-colors ${
              value === option.value
                ? 'border-primary bg-primary/5'
                : 'border-border bg-card hover:bg-accent/50'
            }`}
          >
            <div className="flex items-start gap-2">
              <div
                className={`mt-0.5 h-4 w-4 rounded-full border-2 flex-shrink-0 ${
                  value === option.value
                    ? 'border-primary bg-primary'
                    : 'border-muted-foreground/30'
                }`}
              >
                {value === option.value && (
                  <div className="h-full w-full rounded-full bg-primary-foreground scale-50" />
                )}
              </div>
              <div>
                <div className="text-sm font-medium">{option.label}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{option.description}</div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
