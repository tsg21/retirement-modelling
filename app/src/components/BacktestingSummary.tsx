import type { Inputs } from '../types'
import type { BacktestResult } from '../engine/types'

export function BacktestingSummary({ backtestResult, inputs }: { backtestResult: BacktestResult, inputs: Inputs }) {
  const successRate = Math.round(backtestResult.successRate * 100)

  return (
    <div className="grid gap-3 mb-6">
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="text-xs text-muted-foreground mb-1">Backtesting result</div>
        <div className="text-sm font-medium">
          Your money lasts to your target age in <span className="font-bold">{successRate}%</span> of historical scenarios.
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="text-xs text-muted-foreground mb-1">Worst case</div>
        <div className="text-sm font-medium">
          {backtestResult.worstCase
            ? `In the worst scenario (retiring in ${backtestResult.worstCase.startYear}), money runs out at age ${backtestResult.worstCase.ageMoneyRunsOut}.`
            : `In the worst scenario, money still lasts to age ${inputs.longevity}.`}
        </div>
      </div>
    </div>
  )
}
