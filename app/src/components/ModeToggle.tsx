export function ModeToggle({ backtestingMode, onChange }: { backtestingMode: boolean, onChange: (enabled: boolean) => void }) {
  return (
    <div className="mb-4 flex items-center gap-3 p-3 rounded-lg border border-border bg-card">
      <span className="text-sm font-medium text-muted-foreground">Mode:</span>
      <button
        onClick={() => onChange(false)}
        className={`px-3 py-1.5 text-sm rounded transition-colors ${
          !backtestingMode
            ? 'bg-primary text-primary-foreground font-medium'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        }`}
      >
        Fixed assumptions
      </button>
      <button
        onClick={() => onChange(true)}
        className={`px-3 py-1.5 text-sm rounded transition-colors ${
          backtestingMode
            ? 'bg-primary text-primary-foreground font-medium'
            : 'bg-muted text-muted-foreground hover:bg-muted/80'
        }`}
      >
        Backtesting
      </button>
    </div>
  )
}
