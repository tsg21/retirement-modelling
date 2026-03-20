export function ScenarioSelector({
  years,
  selectedYear,
  onSelect,
}: {
  years: number[]
  selectedYear: number | null
  onSelect: (year: number | null) => void
}) {
  if (years.length === 0) return null

  return (
    <div className="mt-4 rounded-lg border border-border bg-card p-3">
      <div className="mb-2 text-xs text-muted-foreground">Historical scenario timeline</div>
      <div className="flex flex-wrap gap-2">
        {years.map(year => (
          <button
            key={year}
            onClick={() => onSelect(selectedYear === year ? null : year)}
            className={`rounded border px-2 py-1 text-xs transition-colors ${
              selectedYear === year
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-background text-muted-foreground hover:bg-muted'
            }`}
          >
            {year}
          </button>
        ))}
      </div>
    </div>
  )
}
