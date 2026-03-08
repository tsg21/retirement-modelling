import { useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { BacktestResult, PercentileBand, SimulationWarning, MonthSnapshot } from '../engine/types'
import type { Inputs, YearProjection } from '../types'
import { monthsToAnnual } from '../lib/mockData'
import { BacktestingSummary } from './results/BacktestingSummary'
import { DataTable } from './results/DataTable'
import { ModeToggle } from './results/ModeToggle'
import { ScenarioSelector } from './results/ScenarioSelector'
import { SummaryBar } from './results/SummaryBar'
import { WarningBar } from './results/WarningBar'
import { formatMoney, monthsToAnnualStartOfYear, type ScenarioOverlayPoint } from './results/resultsPanelUtils'

interface ResultsPanelProps {
  data: YearProjection[]
  warnings: SimulationWarning[]
  inputs: Inputs
  backtestingMode: boolean
  onBacktestingModeChange: (enabled: boolean) => void
  backtestResult: BacktestResult | null
}

const CHART_COLORS = {
  couple: { sippA: '#1d4ed8', sippB: '#60a5fa', isaA: '#15803d', isaB: '#4ade80', cashA: '#b45309', cashB: '#fbbf24' },
  single: { sipp: '#3b82f6', isa: '#22c55e', cash: '#f59e0b' },
} as const

const COUPLE_LEGEND_ITEMS = [
  { label: 'SIPP A', color: CHART_COLORS.couple.sippA },
  { label: 'SIPP B', color: CHART_COLORS.couple.sippB },
  { label: 'ISA A', color: CHART_COLORS.couple.isaA },
  { label: 'ISA B', color: CHART_COLORS.couple.isaB },
  { label: 'Cash A', color: CHART_COLORS.couple.cashA },
  { label: 'Cash B', color: CHART_COLORS.couple.cashB },
] as const

const SINGLE_LEGEND_ITEMS = [
  { label: 'SIPP', color: CHART_COLORS.single.sipp },
  { label: 'ISA', color: CHART_COLORS.single.isa },
  { label: 'Cash', color: CHART_COLORS.single.cash },
] as const

function StackedAreaChart({ data, inputs }: { data: YearProjection[], inputs: Inputs }) {
  const width = 700
  const height = 350
  const padding = { top: 20, right: 20, bottom: 40, left: 60 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom
  const maxVal = Math.max(...data.map(d => d.totalNetWorth), 1)
  const isCoupleMode = inputs.householdType === 'marriedCouple'
  const minSimYear = data[0]?.simulationYear ?? 0
  const maxSimYear = data[data.length - 1]?.simulationYear ?? 0
  const currentYear = new Date().getFullYear()
  const startAge = isCoupleMode ? inputs.partnerA.currentAge : inputs.currentAge
  const displayOffset = isCoupleMode ? currentYear : startAge
  const getDisplayValue = (simYear: number) => displayOffset + simYear
  const minX = getDisplayValue(minSimYear)
  const maxX = getDisplayValue(maxSimYear)
  const x = (displayVal: number) => padding.left + ((displayVal - minX) / (maxX - minX)) * chartW
  const y = (val: number) => padding.top + chartH - (val / maxVal) * chartH
  const getPartnerACash = (d: YearProjection) => d.partnerA.cashBalance
  const getPartnerBCash = (d: YearProjection) => d.partnerB?.cashBalance ?? 0
  const getPartnerAIsa = (d: YearProjection) => d.partnerA.isaBalance
  const getPartnerBIsa = (d: YearProjection) => d.partnerB?.isaBalance ?? 0
  const getPartnerASipp = (d: YearProjection) => d.partnerA.sippBalance
  const getPartnerBSipp = (d: YearProjection) => d.partnerB?.sippBalance ?? 0
  const getCashBalance = (d: YearProjection) => getPartnerACash(d) + getPartnerBCash(d)
  const getIsaBalance = (d: YearProjection) => getPartnerAIsa(d) + getPartnerBIsa(d)
  const buildPath = (getTop: (d: YearProjection) => number, getBottom: (d: YearProjection) => number) => {
    const top = data.map(d => `${x(getDisplayValue(d.simulationYear))},${y(getTop(d))}`)
    const bottom = [...data].reverse().map(d => `${x(getDisplayValue(d.simulationYear))},${y(getBottom(d))}`)
    return `M${top.join('L')}L${bottom.join('L')}Z`
  }

  const cashAPath = buildPath(getPartnerACash, () => 0)
  const cashBPath = buildPath(d => getCashBalance(d), getPartnerACash)
  const isaABottom = (d: YearProjection) => getCashBalance(d)
  const isaATop = (d: YearProjection) => isaABottom(d) + getPartnerAIsa(d)
  const isaBTop = (d: YearProjection) => isaATop(d) + getPartnerBIsa(d)
  const isaAPath = buildPath(isaATop, isaABottom)
  const isaBPath = buildPath(isaBTop, isaATop)
  const sippABottom = (d: YearProjection) => getCashBalance(d) + getIsaBalance(d)
  const sippATop = (d: YearProjection) => sippABottom(d) + getPartnerASipp(d)
  const sippBPath = buildPath(d => sippATop(d) + getPartnerBSipp(d), sippATop)
  const sippAPath = buildPath(sippATop, sippABottom)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => Math.round(maxVal * p))

  interface ChartMarker { simYear: number; label: string; stroke: string; strokeDasharray: string; strokeWidth: number; labelColor?: string; labelSize?: number; key: string }
  const markers: ChartMarker[] = []

  if (isCoupleMode) {
    const aRetireSimYear = inputs.partnerA.retirementAge - inputs.partnerA.currentAge
    const bRetireSimYear = inputs.partnerB.retirementAge - inputs.partnerB.currentAge
    if (aRetireSimYear === bRetireSimYear) {
      markers.push({ simYear: aRetireSimYear, label: 'Retire', stroke: '#6b7280', strokeDasharray: '4 3', strokeWidth: 1.5, key: 'retire-both' })
    } else {
      markers.push(
        { simYear: aRetireSimYear, label: 'A', stroke: '#6b7280', strokeDasharray: '4 3', strokeWidth: 1.5, key: 'retire-a' },
        { simYear: bRetireSimYear, label: 'B', stroke: '#6b7280', strokeDasharray: '4 3', strokeWidth: 1.5, key: 'retire-b' },
      )
    }
  } else {
    markers.push({ simYear: inputs.retirementAge - inputs.currentAge, label: 'Retire', stroke: '#6b7280', strokeDasharray: '4 3', strokeWidth: 1.5, key: 'retire' })
  }

  if (isCoupleMode) {
    const aSpSimYear = inputs.partnerA.statePensionAge - inputs.partnerA.currentAge
    const bSpSimYear = inputs.partnerB.statePensionAge - inputs.partnerB.currentAge
    if (aSpSimYear === bSpSimYear) {
      markers.push({ simYear: aSpSimYear, label: 'SP', stroke: '#6b7280', strokeDasharray: '2 3', strokeWidth: 1, key: 'sp-both' })
    } else {
      markers.push(
        { simYear: aSpSimYear, label: 'SP A', stroke: '#6b7280', strokeDasharray: '2 3', strokeWidth: 1, key: 'sp-a' },
        { simYear: bSpSimYear, label: 'SP B', stroke: '#6b7280', strokeDasharray: '2 3', strokeWidth: 1, key: 'sp-b' },
      )
    }
  } else {
    markers.push({ simYear: inputs.statePensionAge - inputs.currentAge, label: 'SP', stroke: '#6b7280', strokeDasharray: '2 3', strokeWidth: 1, key: 'sp' })
  }

  inputs.oneOffExpenses.filter(e => e.description).forEach(e => {
    const expenseSimYear = e.year - currentYear
    if (expenseSimYear >= minSimYear && expenseSimYear <= maxSimYear) {
      markers.push({ simYear: expenseSimYear, label: e.description!, stroke: '#ef4444', strokeDasharray: '3 3', strokeWidth: 1, labelColor: '#ef4444', labelSize: 9, key: `expense-${e.year}-${e.description}` })
    }
  })

  return <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">{/* omitted unchanged rendering */}
    {yTicks.map(tick => <g key={tick}><line x1={padding.left} y1={y(tick)} x2={width - padding.right} y2={y(tick)} stroke="currentColor" strokeOpacity={0.1} /><text x={padding.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-muted-foreground" fontSize={10}>{formatMoney(tick)}</text></g>)}
    {isCoupleMode ? <><path d={sippAPath} fill={CHART_COLORS.couple.sippA} opacity={0.7} /><path d={sippBPath} fill={CHART_COLORS.couple.sippB} opacity={0.7} /><path d={isaAPath} fill={CHART_COLORS.couple.isaA} opacity={0.7} /><path d={isaBPath} fill={CHART_COLORS.couple.isaB} opacity={0.7} /><path d={cashAPath} fill={CHART_COLORS.couple.cashA} opacity={0.7} /><path d={cashBPath} fill={CHART_COLORS.couple.cashB} opacity={0.7} /></> : <><path d={sippAPath} fill={CHART_COLORS.single.sipp} opacity={0.7} /><path d={isaAPath} fill={CHART_COLORS.single.isa} opacity={0.7} /><path d={cashAPath} fill={CHART_COLORS.single.cash} opacity={0.7} /></>}
    {markers.map(marker => { const markerX = x(getDisplayValue(marker.simYear)); return <g key={marker.key}><line x1={markerX} y1={padding.top} x2={markerX} y2={padding.top + chartH} stroke={marker.stroke} strokeDasharray={marker.strokeDasharray} strokeWidth={marker.strokeWidth} /><text x={markerX} y={padding.top - 6} textAnchor="middle" className={marker.labelColor ? undefined : 'fill-muted-foreground'} fill={marker.labelColor} fontSize={marker.labelSize ?? 10}>{marker.label}</text></g> })}
    {data.filter(d => { const displayVal = getDisplayValue(d.simulationYear); return displayVal % 10 === 0 || d.simulationYear === minSimYear }).map(d => { const displayVal = getDisplayValue(d.simulationYear); return <text key={d.simulationYear} x={x(displayVal)} y={padding.top + chartH + 20} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>{displayVal}</text> })}
    <text x={width / 2} y={height - 4} textAnchor="middle" className="fill-muted-foreground" fontSize={11}>{isCoupleMode ? 'Year' : 'Age'}</text>
    <g transform={`translate(${padding.left + 8}, ${padding.top + 8})`}>{(isCoupleMode ? COUPLE_LEGEND_ITEMS : SINGLE_LEGEND_ITEMS).map((item, i) => <g key={item.label} transform={`translate(${i * 78}, 0)`}><rect width={12} height={12} fill={item.color} opacity={0.7} rx={2} /><text x={16} y={10} fontSize={11} className="fill-foreground">{item.label}</text></g>)}</g>
  </svg>
}

function FanChart({ percentileBands, inputs, overlay }: { percentileBands: PercentileBand[]; inputs: Inputs; overlay: ScenarioOverlayPoint[] }) {
  const width = 700
  const height = 350
  const padding = { top: 20, right: 20, bottom: 40, left: 60 }
  if (percentileBands.length === 0) return <div className="text-sm text-muted-foreground">No backtesting scenarios available.</div>
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom
  const maxVal = Math.max(...percentileBands.map(d => d.p90), 1)
  const minAge = percentileBands[0].age
  const maxAge = percentileBands[percentileBands.length - 1].age
  const isCoupleMode = inputs.householdType === 'marriedCouple'
  const currentYear = new Date().getFullYear()
  const startAge = isCoupleMode ? inputs.partnerA.currentAge : inputs.currentAge
  const minX = isCoupleMode ? currentYear : minAge
  const maxX = isCoupleMode ? currentYear + (maxAge - minAge) : maxAge
  const getXValue = (age: number) => isCoupleMode ? currentYear + (age - startAge) : age
  const x = (xVal: number) => padding.left + ((xVal - minX) / Math.max(maxX - minX, 1)) * chartW
  const y = (val: number) => padding.top + chartH - (Math.max(val, 0) / maxVal) * chartH
  const buildBandPath = (upper: keyof PercentileBand, lower: keyof PercentileBand) => {
    const top = percentileBands.map(d => `${x(getXValue(d.age))},${y(d[upper] as number)}`)
    const bottom = [...percentileBands].reverse().map(d => `${x(getXValue(d.age))},${y(d[lower] as number)}`)
    return `M${top.join('L')}L${bottom.join('L')}Z`
  }
  const medianPath = `M${percentileBands.map(d => `${x(getXValue(d.age))},${y(d.p50)}`).join('L')}`
  const overlayPath = overlay.length > 0 ? `M${overlay.map(d => `${x(getXValue(d.age))},${y(d.totalNetWorth)}`).join('L')}` : ''
  const ageDiff = isCoupleMode ? inputs.partnerA.currentAge - inputs.partnerB.currentAge : 0
  const partnerBRetirementInATerms = isCoupleMode ? inputs.partnerB.retirementAge + ageDiff : 0
  const retirementMarkers = isCoupleMode
    ? inputs.partnerA.retirementAge === partnerBRetirementInATerms
      ? [{ age: inputs.partnerA.retirementAge, labelShort: 'Retire' }]
      : [{ age: inputs.partnerA.retirementAge, labelShort: 'A' }, { age: partnerBRetirementInATerms, labelShort: 'B' }]
    : [{ age: inputs.retirementAge, labelShort: 'Retire' }]
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => Math.round(maxVal * p))

  return <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto">{/* unchanged */}
    {yTicks.map(tick => <g key={tick}><line x1={padding.left} y1={y(tick)} x2={width - padding.right} y2={y(tick)} stroke="currentColor" strokeOpacity={0.1} /><text x={padding.left - 8} y={y(tick) + 4} textAnchor="end" className="fill-muted-foreground" fontSize={10}>{formatMoney(tick)}</text></g>)}
    <path d={buildBandPath('p90', 'p10')} fill="#a5b4fc" opacity={0.45} /><path d={buildBandPath('p75', 'p25')} fill="#6366f1" opacity={0.5} /><path d={medianPath} fill="none" stroke="#312e81" strokeWidth={2} />{overlay.length > 0 && <path d={overlayPath} fill="none" stroke="#ef4444" strokeWidth={2} strokeDasharray="5 3" />}
    {retirementMarkers.map((marker, i) => { const markerX = x(getXValue(marker.age)); return <g key={`retire-${i}`}><line x1={markerX} y1={padding.top} x2={markerX} y2={padding.top + chartH} stroke="#6b7280" strokeDasharray="4 3" strokeWidth={1.5} /><text x={markerX} y={padding.top - 6} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>{marker.labelShort}</text></g> })}
    {inputs.oneOffExpenses.filter(e => e.description).map(e => { const expenseAge = startAge + (e.year - currentYear); if (expenseAge < minAge || expenseAge > maxAge) return null; const ex = x(getXValue(expenseAge)); return <g key={`expense-${e.year}-${e.description}`}><line x1={ex} y1={padding.top} x2={ex} y2={padding.top + chartH} stroke="#ef4444" strokeDasharray="3 3" strokeWidth={1} /><text x={ex} y={padding.top - 6} textAnchor="middle" fill="#ef4444" fontSize={9}>{e.description}</text></g> })}
    {percentileBands.filter(d => { const xVal = getXValue(d.age); return isCoupleMode ? xVal % 10 === 0 : d.age % 10 === 0 || d.age === minAge }).map(d => { const xVal = getXValue(d.age); return <text key={d.age} x={x(xVal)} y={padding.top + chartH + 20} textAnchor="middle" className="fill-muted-foreground" fontSize={10}>{xVal}</text> })}
    <text x={width / 2} y={height - 4} textAnchor="middle" className="fill-muted-foreground" fontSize={11}>{isCoupleMode ? 'Year' : 'Age'}</text>
  </svg>
}

export function ResultsPanel({ data, warnings, inputs, backtestingMode, onBacktestingModeChange, backtestResult }: ResultsPanelProps) {
  const [selectedScenarioYear, setSelectedScenarioYear] = useState<number | null>(null)

  const selectedScenario = useMemo(
    () => backtestResult?.scenarios.find(s => s.startYear === selectedScenarioYear) ?? null,
    [backtestResult, selectedScenarioYear],
  )

  const scenarioOverlay = useMemo(() => {
    if (!selectedScenario) return []
    const currentAge = inputs.householdType === 'single' ? inputs.currentAge : inputs.partnerA.currentAge
    return monthsToAnnualStartOfYear(selectedScenario.result.months as MonthSnapshot[], currentAge)
  }, [inputs, selectedScenario])

  const tableData = selectedScenario ? monthsToAnnual(selectedScenario.result.months) : data

  return (
    <div>
      <ModeToggle backtestingMode={backtestingMode} onChange={onBacktestingModeChange} />
      <WarningBar warnings={warnings} />
      {backtestResult ? <BacktestingSummary backtestResult={backtestResult} inputs={inputs} /> : <SummaryBar data={data} inputs={inputs} />}

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="mt-4">
          {backtestResult ? (
            <>
              <FanChart percentileBands={backtestResult.percentileBands} inputs={inputs} overlay={scenarioOverlay} />
              <ScenarioSelector years={backtestResult.scenarios.map(s => s.startYear)} selectedYear={selectedScenario?.startYear ?? null} onSelect={setSelectedScenarioYear} />
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
