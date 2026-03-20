import { useMemo } from 'react'
import type { Inputs, YearProjection } from '../types'
import { computeSummary } from '../lib/mockData'
import { formatMoney } from './charts/chartConstants'

export function SummaryBar({ data, inputs }: { data: YearProjection[], inputs: Inputs }) {
  const summary = useMemo(() => computeSummary(data, inputs), [data, inputs])
  const isCoupleMode = inputs.householdType === 'marriedCouple'

  const statusColor = {
    green: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    amber: 'bg-amber-100 text-amber-800 border-amber-300',
    red: 'bg-red-100 text-red-800 border-red-300',
  }[summary.status]

  // Partner-specific values for couple mode
  const partnerARetirementAge = isCoupleMode ? inputs.partnerA.retirementAge : null
  const partnerBRetirementAge = isCoupleMode ? inputs.partnerB.retirementAge : null

  const retirementRow = data.find(d => d.partnerA.age === summary.retirementAge)
  const partnerAPot = retirementRow
    ? retirementRow.partnerA.sippBalance + retirementRow.partnerA.isaBalance + retirementRow.partnerA.cashBalance
    : 0
  const partnerBPot = retirementRow?.partnerB
    ? retirementRow.partnerB.sippBalance + retirementRow.partnerB.isaBalance + retirementRow.partnerB.cashBalance
    : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="text-xs text-muted-foreground">Retirement age</div>
        <div className="text-2xl font-bold">{summary.retirementAge}</div>
        {isCoupleMode && (
          <div className="text-xs text-muted-foreground mt-1">
            A: {partnerARetirementAge} · B: {partnerBRetirementAge}
          </div>
        )}
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="text-xs text-muted-foreground">Years funded</div>
        <div className="text-2xl font-bold">{summary.yearsFunded}</div>
      </div>
      <div className={`rounded-lg border p-3 ${statusColor}`}>
        <div className="text-xs opacity-70">Outcome</div>
        <div className="text-sm font-semibold">{summary.outcome}</div>
      </div>
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="text-xs text-muted-foreground">Pot at retirement</div>
        <div className="text-2xl font-bold">{formatMoney(summary.totalAtRetirement)}</div>
        {isCoupleMode && partnerBPot > 0 && (
          <div className="text-xs text-muted-foreground mt-1">
            A: {formatMoney(partnerAPot)} · B: {formatMoney(partnerBPot)}
          </div>
        )}
      </div>
    </div>
  )
}
