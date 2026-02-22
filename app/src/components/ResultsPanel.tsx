import { useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Inputs, YearProjection } from '../types'
import type { BacktestResult, MonthSnapshot, PercentileBand, SimulationWarning } from '../engine/types'
import { computeSummary, monthsToAnnual } from '../lib/mockData'

interface ResultsPanelProps {
  data: YearProjection[]
  warnings: SimulationWarning[]
  inputs: Inputs
  backtestingMode: boolean
  onBacktestingModeChange: (enabled: boolean) => void
  backtestResult: BacktestResult | null
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`
  return `£${n}`
}

function SummaryBar({ data, inputs }: { data: YearProjection[], inputs: Inputs }) {
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

function BacktestingSummary({ backtestResult, inputs }: { backtestResult: BacktestResult, inputs: Inputs }) {
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

function StackedAreaChart({ data, inputs }: { data: YearProjection[], inputs: Inputs }) {
  const width = 700
  const height = 350
  const padding = { top: 20, right: 20, bottom: 40, left: 60 }

  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const maxVal = Math.max(...data.map(d => d.totalNetWorth), 1)
  const minAge = data[0]?.partnerA.age ?? 0
  const maxAge = data[data.length - 1]?.partnerA.age ?? 100

  const isCoupleMode = inputs.householdType === 'marriedCouple'

  // For couple mode, use calendar year for x-axis; for single mode, use age
  const currentYear = new Date().getFullYear()
  const startAge = isCoupleMode ? inputs.partnerA.currentAge : inputs.currentAge
  const minX = isCoupleMode ? currentYear : minAge
  const maxX = isCoupleMode ? currentYear + (maxAge - minAge) : maxAge

  // Convert age to x-axis value (year in couple mode, age in single mode)
  const getXValue = (age: number) => isCoupleMode ? currentYear + (age - startAge) : age

  const x = (xVal: number) => padding.left + ((xVal - minX) / (maxX - minX)) * chartW
  const y = (val: number) => padding.top + chartH - (val / maxVal) * chartH

  // Helper to aggregate balances across partners
  const getCashBalance = (d: YearProjection) => d.partnerA.cashBalance + (d.partnerB?.cashBalance ?? 0)
  const getIsaBalance = (d: YearProjection) => d.partnerA.isaBalance + (d.partnerB?.isaBalance ?? 0)

  // Build stacked paths: Cash (bottom), ISA (middle), SIPP (top)
  const buildPath = (getTop: (d: YearProjection) => number, getBottom: (d: YearProjection) => number) => {
    const top = data.map(d => `${x(getXValue(d.partnerA.age))},${y(getTop(d))}`)
    const bottom = [...data].reverse().map(d => `${x(getXValue(d.partnerA.age))},${y(getBottom(d))}`)
    return `M${top.join('L')}L${bottom.join('L')}Z`
  }

  const cashPath = buildPath(
    getCashBalance,
    () => 0,
  )
  const isaPath = buildPath(
    d => getCashBalance(d) + getIsaBalance(d),
    getCashBalance,
  )
  const sippPath = buildPath(
    d => d.totalNetWorth,
    d => getCashBalance(d) + getIsaBalance(d),
  )

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => Math.round(maxVal * p))

  // In couple mode, convert Partner B's ages to "Partner A age terms" for chart positioning
  // (since chart x-axis is based on Partner A's timeline)
  const ageDiff = isCoupleMode ? inputs.partnerA.currentAge - inputs.partnerB.currentAge : 0
  const partnerBRetirementInATerms = isCoupleMode ? inputs.partnerB.retirementAge + ageDiff : 0
  const partnerBSpAgeInATerms = isCoupleMode ? inputs.partnerB.statePensionAge + ageDiff : 0

  // Retirement markers - show both partners in couple mode, deduplicate if same calendar year
  const retirementMarkers = isCoupleMode
    ? inputs.partnerA.retirementAge === partnerBRetirementInATerms
      ? [{ age: inputs.partnerA.retirementAge, label: 'Both retire', labelShort: 'Retire' }]
      : [
          { age: inputs.partnerA.retirementAge, label: 'A retires', labelShort: 'A' },
          { age: partnerBRetirementInATerms, label: 'B retires', labelShort: 'B' },
        ]
    : [{ age: inputs.retirementAge, label: `Retire`, labelShort: 'Retire' }]

  // State pension markers - show both partners in couple mode, deduplicate if same calendar year
  const statePensionMarkers = isCoupleMode
    ? inputs.partnerA.statePensionAge === partnerBSpAgeInATerms
      ? [{ age: inputs.partnerA.statePensionAge, label: 'SP both', labelShort: 'SP' }]
      : [
          { age: inputs.partnerA.statePensionAge, label: 'SP A', labelShort: 'SP A' },
          { age: partnerBSpAgeInATerms, label: 'SP B', labelShort: 'SP B' },
        ]
    : [{ age: inputs.statePensionAge, label: 'SP', labelShort: 'SP' }]

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {/* Grid lines */}
      {yTicks.map(tick => (
        <g key={tick}>
          <line
            x1={padding.left}
            y1={y(tick)}
            x2={width - padding.right}
            y2={y(tick)}
            stroke="currentColor"
            strokeOpacity={0.1}
          />
          <text
            x={padding.left - 8}
            y={y(tick) + 4}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize={10}
          >
            {formatMoney(tick)}
          </text>
        </g>
      ))}

      {/* Stacked areas */}
      <path d={sippPath} fill="#3b82f6" opacity={0.7} />
      <path d={isaPath} fill="#22c55e" opacity={0.7} />
      <path d={cashPath} fill="#f59e0b" opacity={0.7} />

      {/* Retirement age markers */}
      {retirementMarkers.map((marker, i) => {
        const markerX = x(getXValue(marker.age))
        return (
          <g key={`retire-${i}`}>
            <line
              x1={markerX}
              y1={padding.top}
              x2={markerX}
              y2={padding.top + chartH}
              stroke="#6b7280"
              strokeDasharray="4 3"
              strokeWidth={1.5}
            />
            <text
              x={markerX}
              y={padding.top - 6}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={10}
            >
              {marker.labelShort}
            </text>
          </g>
        )
      })}

      {/* State pension age markers */}
      {statePensionMarkers.map((marker, i) => (
        <g key={`sp-${i}`}>
          <line
            x1={x(getXValue(marker.age))}
            y1={padding.top}
            x2={x(getXValue(marker.age))}
            y2={padding.top + chartH}
            stroke="#6b7280"
            strokeDasharray="2 3"
            strokeWidth={1}
          />
          <text
            x={x(getXValue(marker.age))}
            y={padding.top - 6}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={10}
          >
            {marker.labelShort}
          </text>
        </g>
      ))}

      {/* One-off expense markers */}
      {inputs.oneOffExpenses
        .filter(e => e.description)
        .map(e => {
          const expenseAge = startAge + (e.year - currentYear)
          if (expenseAge < minAge || expenseAge > maxAge) return null
          const ex = x(getXValue(expenseAge))
          return (
            <g key={`expense-${e.year}-${e.description}`}>
              <line
                x1={ex}
                y1={padding.top}
                x2={ex}
                y2={padding.top + chartH}
                stroke="#ef4444"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <text
                x={ex}
                y={padding.top - 6}
                textAnchor="middle"
                fill="#ef4444"
                fontSize={9}
              >
                {e.description}
              </text>
            </g>
          )
        })}

      {/* X-axis labels */}
      {data
        .filter(d => {
          const xVal = getXValue(d.partnerA.age)
          return isCoupleMode ? xVal % 10 === 0 : d.partnerA.age % 10 === 0 || d.partnerA.age === minAge
        })
        .map(d => {
          const xVal = getXValue(d.partnerA.age)
          return (
            <text
              key={d.partnerA.age}
              x={x(xVal)}
              y={padding.top + chartH + 20}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={10}
            >
              {xVal}
            </text>
          )
        })}
      <text
        x={width / 2}
        y={height - 4}
        textAnchor="middle"
        className="fill-muted-foreground"
        fontSize={11}
      >
        {isCoupleMode ? 'Year' : 'Age'}
      </text>

      {/* Legend */}
      <g transform={`translate(${padding.left + 8}, ${padding.top + 8})`}>
        {[
          { label: 'SIPP', color: '#3b82f6' },
          { label: 'ISA', color: '#22c55e' },
          { label: 'Cash', color: '#f59e0b' },
        ].map((item, i) => (
          <g key={item.label} transform={`translate(${i * 70}, 0)`}>
            <rect width={12} height={12} fill={item.color} opacity={0.7} rx={2} />
            <text x={16} y={10} fontSize={11} className="fill-foreground">
              {item.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}

interface ScenarioOverlayPoint {
  age: number
  totalNetWorth: number
}

function monthsToAnnualStartOfYear(months: MonthSnapshot[], currentAge: number): ScenarioOverlayPoint[] {
  const annualPoints: ScenarioOverlayPoint[] = []

  for (let age = currentAge; ; age++) {
    const monthIndex = (age - currentAge) * 12
    const month = months[monthIndex]
    if (!month) break

    annualPoints.push({
      age,
      totalNetWorth: Math.round(month.totalReal),
    })
  }

  return annualPoints
}

function FanChart({
  percentileBands,
  inputs,
  overlay,
}: {
  percentileBands: PercentileBand[]
  inputs: Inputs
  overlay: ScenarioOverlayPoint[]
}) {
  const width = 700
  const height = 350
  const padding = { top: 20, right: 20, bottom: 40, left: 60 }

  if (percentileBands.length === 0) {
    return <div className="text-sm text-muted-foreground">No backtesting scenarios available.</div>
  }

  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const maxVal = Math.max(...percentileBands.map(d => d.p90), 1)
  const minAge = percentileBands[0].age
  const maxAge = percentileBands[percentileBands.length - 1].age

  const isCoupleMode = inputs.householdType === 'marriedCouple'

  // For couple mode, use calendar year for x-axis; for single mode, use age
  const currentYear = new Date().getFullYear()
  const startAge = isCoupleMode ? inputs.partnerA.currentAge : inputs.currentAge
  const minX = isCoupleMode ? currentYear : minAge
  const maxX = isCoupleMode ? currentYear + (maxAge - minAge) : maxAge

  // Convert age to x-axis value (year in couple mode, age in single mode)
  const getXValue = (age: number) => isCoupleMode ? currentYear + (age - startAge) : age

  const x = (xVal: number) => padding.left + ((xVal - minX) / Math.max(maxX - minX, 1)) * chartW
  const y = (val: number) => padding.top + chartH - (Math.max(val, 0) / maxVal) * chartH

  const buildBandPath = (upper: keyof PercentileBand, lower: keyof PercentileBand) => {
    const top = percentileBands.map(d => `${x(getXValue(d.age))},${y(d[upper] as number)}`)
    const bottom = [...percentileBands].reverse().map(d => `${x(getXValue(d.age))},${y(d[lower] as number)}`)
    return `M${top.join('L')}L${bottom.join('L')}Z`
  }

  const medianPath = `M${percentileBands.map(d => `${x(getXValue(d.age))},${y(d.p50)}`).join('L')}`
  const overlayPath = overlay.length > 0
    ? `M${overlay.map(d => `${x(getXValue(d.age))},${y(d.totalNetWorth)}`).join('L')}`
    : ''

  // In couple mode, convert Partner B's ages to "Partner A age terms" for chart positioning
  const ageDiff = isCoupleMode ? inputs.partnerA.currentAge - inputs.partnerB.currentAge : 0
  const partnerBRetirementInATerms = isCoupleMode ? inputs.partnerB.retirementAge + ageDiff : 0

  // Retirement markers - show both partners in couple mode, deduplicate if same calendar year
  const retirementMarkers = isCoupleMode
    ? inputs.partnerA.retirementAge === partnerBRetirementInATerms
      ? [{ age: inputs.partnerA.retirementAge, label: 'Both retire', labelShort: 'Retire' }]
      : [
          { age: inputs.partnerA.retirementAge, label: 'A retires', labelShort: 'A' },
          { age: partnerBRetirementInATerms, label: 'B retires', labelShort: 'B' },
        ]
    : [{ age: inputs.retirementAge, label: `Retire`, labelShort: 'Retire' }]

  // Note: No state pension markers in FanChart (backtesting mode)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => Math.round(maxVal * p))

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">
      {yTicks.map(tick => (
        <g key={tick}>
          <line
            x1={padding.left}
            y1={y(tick)}
            x2={width - padding.right}
            y2={y(tick)}
            stroke="currentColor"
            strokeOpacity={0.1}
          />
          <text
            x={padding.left - 8}
            y={y(tick) + 4}
            textAnchor="end"
            className="fill-muted-foreground"
            fontSize={10}
          >
            {formatMoney(tick)}
          </text>
        </g>
      ))}

      <path d={buildBandPath('p90', 'p10')} fill="#a5b4fc" opacity={0.45} />
      <path d={buildBandPath('p75', 'p25')} fill="#6366f1" opacity={0.5} />
      <path d={medianPath} fill="none" stroke="#312e81" strokeWidth={2} />
      {overlay.length > 0 && (
        <path d={overlayPath} fill="none" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 3" />
      )}

      {/* Retirement age markers */}
      {retirementMarkers.map((marker, i) => {
        const markerX = x(getXValue(marker.age))
        return (
          <g key={`retire-${i}`}>
            <line
              x1={markerX}
              y1={padding.top}
              x2={markerX}
              y2={padding.top + chartH}
              stroke="#6b7280"
              strokeDasharray="4 3"
              strokeWidth={1.5}
            />
            <text
              x={markerX}
              y={padding.top - 6}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={10}
            >
              {marker.labelShort}
            </text>
          </g>
        )
      })}

      {/* One-off expense markers */}
      {inputs.oneOffExpenses
        .filter(e => e.description)
        .map(e => {
          const expenseAge = startAge + (e.year - currentYear)
          if (expenseAge < minAge || expenseAge > maxAge) return null
          const ex = x(getXValue(expenseAge))
          return (
            <g key={`expense-${e.year}-${e.description}`}>
              <line
                x1={ex}
                y1={padding.top}
                x2={ex}
                y2={padding.top + chartH}
                stroke="#ef4444"
                strokeDasharray="3 3"
                strokeWidth={1}
              />
              <text
                x={ex}
                y={padding.top - 6}
                textAnchor="middle"
                fill="#ef4444"
                fontSize={9}
              >
                {e.description}
              </text>
            </g>
          )
        })}

      {percentileBands
        .filter(d => {
          const xVal = getXValue(d.age)
          return isCoupleMode ? xVal % 10 === 0 : d.age % 10 === 0 || d.age === minAge
        })
        .map(d => {
          const xVal = getXValue(d.age)
          return (
            <text
              key={d.age}
              x={x(xVal)}
              y={padding.top + chartH + 20}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={10}
            >
              {xVal}
            </text>
          )
        })}
      <text
        x={width / 2}
        y={height - 4}
        textAnchor="middle"
        className="fill-muted-foreground"
        fontSize={11}
      >
        {isCoupleMode ? 'Year' : 'Age'}
      </text>

      <g transform={`translate(${padding.left + 8}, ${padding.top + 8})`}>
        {[
          { label: '10th–90th percentile', color: '#a5b4fc', opacity: 0.45 },
          { label: '25th–75th percentile', color: '#6366f1', opacity: 0.5 },
          { label: 'Median (50th)', color: '#312e81', opacity: 1 },
          ...(overlay.length > 0
            ? [{ label: 'Selected scenario', color: '#ef4444', opacity: 1 }]
            : []),
        ].map((item, i) => (
          <g key={item.label} transform={`translate(${i * 130}, 0)`}>
            {item.label.includes('Median') || item.label.includes('scenario')
              ? <line x1={0} y1={6} x2={12} y2={6} stroke={item.color} strokeWidth={2} />
              : <rect width={12} height={12} fill={item.color} opacity={item.opacity} rx={2} />}
            <text x={16} y={10} fontSize={11} className="fill-foreground">
              {item.label}
            </text>
          </g>
        ))}
      </g>
    </svg>
  )
}

function ScenarioSelector({
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

function DataTable({ data, inputs }: { data: YearProjection[], inputs: Inputs }) {
  const retirementAge =
    inputs.householdType === 'single'
      ? inputs.retirementAge
      : Math.min(inputs.partnerA.retirementAge, inputs.partnerB.retirementAge)

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left">
            <th className="p-2 font-medium">Age</th>
            <th className="p-2 font-medium text-right">Salary</th>
            <th className="p-2 font-medium text-right">Contribs</th>
            <th className="p-2 font-medium text-right">Spending</th>
            <th className="p-2 font-medium text-right">SIPP</th>
            <th className="p-2 font-medium text-right">ISA</th>
            <th className="p-2 font-medium text-right">Cash</th>
            <th className="p-2 font-medium text-right">Total</th>
            <th className="p-2 font-medium text-right">Tax</th>
          </tr>
        </thead>
        <tbody>
          {data.map(row => {
            const age = row.partnerA.age
            const salary = row.partnerA.salary + (row.partnerB?.salary ?? 0)
            const contributions = row.partnerA.contributions + (row.partnerB?.contributions ?? 0)
            const sippBalance = row.partnerA.sippBalance + (row.partnerB?.sippBalance ?? 0)
            const isaBalance = row.partnerA.isaBalance + (row.partnerB?.isaBalance ?? 0)
            const cashBalance = row.partnerA.cashBalance + (row.partnerB?.cashBalance ?? 0)
            const taxPaid = row.partnerA.taxPaid + (row.partnerB?.taxPaid ?? 0)

            const isRetired = age >= retirementAge
            const isRunOut = isRetired && row.totalNetWorth <= 0
            return (
              <tr
                key={age}
                className={`border-b border-border/50 ${
                  age === retirementAge
                    ? 'bg-primary/5 font-medium'
                    : isRunOut
                      ? 'bg-red-50 text-red-700'
                      : ''
                }`}
              >
                <td className="p-2">{age}</td>
                <td className="p-2 text-right">{salary ? formatMoney(salary) : '—'}</td>
                <td className="p-2 text-right">{contributions ? formatMoney(contributions) : '—'}</td>
                <td className="p-2 text-right">{row.spending ? formatMoney(row.spending) : '—'}</td>
                <td className="p-2 text-right">{formatMoney(sippBalance)}</td>
                <td className="p-2 text-right">{formatMoney(isaBalance)}</td>
                <td className="p-2 text-right">{formatMoney(cashBalance)}</td>
                <td className="p-2 text-right font-medium">{formatMoney(row.totalNetWorth)}</td>
                <td className="p-2 text-right">{taxPaid ? formatMoney(taxPaid) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function WarningBar({ warnings }: { warnings: SimulationWarning[] }) {
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

function ModeToggle({ backtestingMode, onChange }: { backtestingMode: boolean, onChange: (enabled: boolean) => void }) {
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

export function ResultsPanel({ data, warnings, inputs, backtestingMode, onBacktestingModeChange, backtestResult }: ResultsPanelProps) {
  const [selectedScenarioYear, setSelectedScenarioYear] = useState<number | null>(null)

  const selectedScenario = useMemo(
    () => backtestResult?.scenarios.find(s => s.startYear === selectedScenarioYear) ?? null,
    [backtestResult, selectedScenarioYear],
  )

  const scenarioOverlay = useMemo(
    () => selectedScenario ? monthsToAnnualStartOfYear(selectedScenario.result.months, inputs.currentAge) : [],
    [inputs.currentAge, selectedScenario],
  )

  const tableData = selectedScenario ? monthsToAnnual(selectedScenario.result.months) : data

  return (
    <div>
      <ModeToggle backtestingMode={backtestingMode} onChange={onBacktestingModeChange} />
      <WarningBar warnings={warnings} />
      {backtestResult ? (
        <BacktestingSummary backtestResult={backtestResult} inputs={inputs} />
      ) : (
        <SummaryBar data={data} inputs={inputs} />
      )}

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="mt-4">
          {backtestResult ? (
            <>
              <FanChart
                percentileBands={backtestResult.percentileBands}
                inputs={inputs}
                overlay={scenarioOverlay}
              />
              <ScenarioSelector
                years={backtestResult.scenarios.map(s => s.startYear)}
                selectedYear={selectedScenario?.startYear ?? null}
                onSelect={setSelectedScenarioYear}
              />
            </>
          ) : (
            <StackedAreaChart data={data} inputs={inputs} />
          )}
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <DataTable data={tableData} inputs={inputs} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
