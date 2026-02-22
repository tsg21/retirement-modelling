import type { HouseholdType } from '../types'

interface HouseholdTypeToggleProps {
  value: HouseholdType
  onChange: (type: HouseholdType) => void
}

export function HouseholdTypeToggle({ value, onChange }: HouseholdTypeToggleProps) {
  return (
    <div className="flex gap-2 p-1 bg-muted/30 rounded-lg">
      <button
        type="button"
        onClick={() => onChange('single')}
        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          value === 'single'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
      >
        Single
      </button>
      <button
        type="button"
        onClick={() => onChange('marriedCouple')}
        className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
          value === 'marriedCouple'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
        }`}
      >
        Married Couple
      </button>
    </div>
  )
}
