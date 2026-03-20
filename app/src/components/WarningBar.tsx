import type { SimulationWarning } from '../engine/types'

export function WarningBar({ warnings }: { warnings: SimulationWarning[] }) {
  if (warnings.length === 0) return null

  const inputWarnings = warnings.filter(w => w.type === 'input_validation')
  const simWarnings = warnings.filter(w => w.type !== 'input_validation')

  // Deduplicate simulation warnings by type (e.g. only show ISA limit once, not per-year)
  const deduped = new Map<string, SimulationWarning>()
  for (const w of simWarnings) {
    if (!deduped.has(w.type)) {
      deduped.set(w.type, w)
    }
  }
  // Show count if multiple years affected
  const displayWarnings: { message: string; isError: boolean }[] = []

  for (const w of inputWarnings) {
    displayWarnings.push({ message: w.message, isError: true })
  }

  for (const [type, first] of deduped) {
    const count = simWarnings.filter(w => w.type === type).length
    const msg = count > 1
      ? `${first.message} (and ${count - 1} other year${count - 1 > 1 ? 's' : ''})`
      : first.message
    displayWarnings.push({ message: msg, isError: false })
  }

  return (
    <div className="mb-4 space-y-2">
      {displayWarnings.map((w, i) => (
        <div
          key={i}
          className={`rounded-lg border px-4 py-2.5 text-sm ${
            w.isError
              ? 'border-red-300 bg-red-50 text-red-800'
              : 'border-amber-300 bg-amber-50 text-amber-800'
          }`}
        >
          {w.message}
        </div>
      ))}
    </div>
  )
}
