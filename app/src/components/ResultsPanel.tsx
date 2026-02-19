import { useState, useMemo } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Inputs, YearProjection } from '../types'
import { computeSummary } from '../lib/mockData'

interface ResultsPanelProps {
  data: YearProjection[]
  inputs: Inputs
}

function formatMoney(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`
  return `£${n}`
}

function SummaryBar({ data, inputs }: ResultsPanelProps) {
  const summary = useMemo(() => computeSummary(data, inputs), [data, inputs])

  const statusColor = {
    green: 'bg-emerald-100 text-emerald-800 border-emerald-300',
    amber: 'bg-amber-100 text-amber-800 border-amber-300',
    red: 'bg-red-100 text-red-800 border-red-300',
  }[summary.status]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      <div className="rounded-lg border border-border bg-card p-3">
        <div className="text-xs text-muted-foreground">Retirement age</div>
        <div className="text-2xl font-bold">{inputs.retirementAge}</div>
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
      </div>
    </div>
  )
}

function StackedAreaChart({ data, inputs }: ResultsPanelProps) {
  const width = 700
  const height = 350
  const padding = { top: 20, right: 20, bottom: 40, left: 60 }

  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const maxVal = Math.max(...data.map(d => d.totalNetWorth), 1)
  const minAge = data[0]?.age ?? 0
  const maxAge = data[data.length - 1]?.age ?? 100

  const x = (age: number) => padding.left + ((age - minAge) / (maxAge - minAge)) * chartW
  const y = (val: number) => padding.top + chartH - (val / maxVal) * chartH

  // Build stacked paths: Cash (bottom), ISA (middle), SIPP (top)
  const buildPath = (getTop: (d: YearProjection) => number, getBottom: (d: YearProjection) => number) => {
    const top = data.map(d => `${x(d.age)},${y(getTop(d))}`)
    const bottom = [...data].reverse().map(d => `${x(d.age)},${y(getBottom(d))}`)
    return `M${top.join('L')}L${bottom.join('L')}Z`
  }

  const cashPath = buildPath(
    d => d.cashBalance,
    () => 0,
  )
  const isaPath = buildPath(
    d => d.cashBalance + d.isaBalance,
    d => d.cashBalance,
  )
  const sippPath = buildPath(
    d => d.totalNetWorth,
    d => d.cashBalance + d.isaBalance,
  )

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => Math.round(maxVal * p))

  // Retirement age marker
  const retirementX = x(inputs.retirementAge)
  const statePensionX = x(inputs.statePensionAge)

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

      {/* Retirement age marker */}
      <line
        x1={retirementX}
        y1={padding.top}
        x2={retirementX}
        y2={padding.top + chartH}
        stroke="#6b7280"
        strokeDasharray="4 3"
        strokeWidth={1.5}
      />
      <text
        x={retirementX}
        y={padding.top - 6}
        textAnchor="middle"
        className="fill-muted-foreground"
        fontSize={10}
      >
        Retire {inputs.retirementAge}
      </text>

      {/* State pension age marker */}
      {inputs.statePensionAge > inputs.retirementAge && (
        <>
          <line
            x1={statePensionX}
            y1={padding.top}
            x2={statePensionX}
            y2={padding.top + chartH}
            stroke="#6b7280"
            strokeDasharray="2 3"
            strokeWidth={1}
          />
          <text
            x={statePensionX}
            y={padding.top - 6}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={10}
          >
            SP {inputs.statePensionAge}
          </text>
        </>
      )}

      {/* X-axis labels */}
      {data
        .filter(d => d.age % 10 === 0 || d.age === minAge)
        .map(d => (
          <text
            key={d.age}
            x={x(d.age)}
            y={padding.top + chartH + 20}
            textAnchor="middle"
            className="fill-muted-foreground"
            fontSize={10}
          >
            {d.age}
          </text>
        ))}
      <text
        x={width / 2}
        y={height - 4}
        textAnchor="middle"
        className="fill-muted-foreground"
        fontSize={11}
      >
        Age
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

function DataTable({ data, inputs }: ResultsPanelProps) {
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
            const isRetired = row.age >= inputs.retirementAge
            const isRunOut = isRetired && row.totalNetWorth <= 0
            return (
              <tr
                key={row.age}
                className={`border-b border-border/50 ${
                  row.age === inputs.retirementAge
                    ? 'bg-primary/5 font-medium'
                    : isRunOut
                      ? 'bg-red-50 text-red-700'
                      : ''
                }`}
              >
                <td className="p-2">{row.age}</td>
                <td className="p-2 text-right">{row.salary ? formatMoney(row.salary) : '—'}</td>
                <td className="p-2 text-right">{row.contributions ? formatMoney(row.contributions) : '—'}</td>
                <td className="p-2 text-right">{row.spending ? formatMoney(row.spending) : '—'}</td>
                <td className="p-2 text-right">{formatMoney(row.sippBalance)}</td>
                <td className="p-2 text-right">{formatMoney(row.isaBalance)}</td>
                <td className="p-2 text-right">{formatMoney(row.cashBalance)}</td>
                <td className="p-2 text-right font-medium">{formatMoney(row.totalNetWorth)}</td>
                <td className="p-2 text-right">{row.taxPaid ? formatMoney(row.taxPaid) : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export function ResultsPanel({ data, inputs }: ResultsPanelProps) {
  return (
    <div>
      <SummaryBar data={data} inputs={inputs} />

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="mt-4">
          <StackedAreaChart data={data} inputs={inputs} />
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <DataTable data={data} inputs={inputs} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
