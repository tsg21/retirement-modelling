import type { Inputs, YearProjection } from '../../types'
import { formatMoney, CHART_COLORS, COUPLE_LEGEND_ITEMS, SINGLE_LEGEND_ITEMS } from './chartConstants'

interface ChartMarker {
  simYear: number
  label: string
  stroke: string
  strokeDasharray: string
  strokeWidth: number
  labelColor?: string
  labelSize?: number
  key: string
}

export function StackedAreaChart({ data, inputs }: { data: YearProjection[], inputs: Inputs }) {
  const width = 700
  const height = 350
  const padding = { top: 20, right: 20, bottom: 40, left: 60 }

  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const maxVal = Math.max(...data.map(d => d.totalNetWorth), 1)

  const isCoupleMode = inputs.householdType === 'marriedCouple'

  // Use simulationYear as primary x-axis dimension
  const minSimYear = data[0]?.simulationYear ?? 0
  const maxSimYear = data[data.length - 1]?.simulationYear ?? 0

  // For display, offset by current year (couple mode) or start age (single mode)
  const currentYear = new Date().getFullYear()
  const startAge = isCoupleMode ? inputs.partnerA.currentAge : inputs.currentAge
  const displayOffset = isCoupleMode ? currentYear : startAge
  const getDisplayValue = (simYear: number) => displayOffset + simYear

  const minX = getDisplayValue(minSimYear)
  const maxX = getDisplayValue(maxSimYear)

  const x = (displayVal: number) => padding.left + ((displayVal - minX) / (maxX - minX)) * chartW
  const y = (val: number) => padding.top + chartH - (val / maxVal) * chartH

  // Partner/category helpers
  const getPartnerACash = (d: YearProjection) => d.partnerA.cashBalance
  const getPartnerBCash = (d: YearProjection) => d.partnerB?.cashBalance ?? 0
  const getPartnerAIsa = (d: YearProjection) => d.partnerA.isaBalance
  const getPartnerBIsa = (d: YearProjection) => d.partnerB?.isaBalance ?? 0
  const getPartnerASipp = (d: YearProjection) => d.partnerA.sippBalance
  const getPartnerBSipp = (d: YearProjection) => d.partnerB?.sippBalance ?? 0

  const getCashBalance = (d: YearProjection) => getPartnerACash(d) + getPartnerBCash(d)
  const getIsaBalance = (d: YearProjection) => getPartnerAIsa(d) + getPartnerBIsa(d)

  // Build stacked paths: Cash (bottom), ISA (middle), SIPP (top)
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

  // Y-axis ticks
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(p => Math.round(maxVal * p))

  // Build unified marker list with styling
  const markers: ChartMarker[] = []

  // Retirement markers
  if (isCoupleMode) {
    const aRetireSimYear = inputs.partnerA.retirementAge - inputs.partnerA.currentAge
    const bRetireSimYear = inputs.partnerB.retirementAge - inputs.partnerB.currentAge
    if (aRetireSimYear === bRetireSimYear) {
      markers.push({
        simYear: aRetireSimYear,
        label: 'Retire',
        stroke: '#6b7280',
        strokeDasharray: '4 3',
        strokeWidth: 1.5,
        key: 'retire-both',
      })
    } else {
      markers.push(
        {
          simYear: aRetireSimYear,
          label: 'A',
          stroke: '#6b7280',
          strokeDasharray: '4 3',
          strokeWidth: 1.5,
          key: 'retire-a',
        },
        {
          simYear: bRetireSimYear,
          label: 'B',
          stroke: '#6b7280',
          strokeDasharray: '4 3',
          strokeWidth: 1.5,
          key: 'retire-b',
        }
      )
    }
  } else {
    markers.push({
      simYear: inputs.retirementAge - inputs.currentAge,
      label: 'Retire',
      stroke: '#6b7280',
      strokeDasharray: '4 3',
      strokeWidth: 1.5,
      key: 'retire',
    })
  }

  // State pension markers
  if (isCoupleMode) {
    const aSpSimYear = inputs.partnerA.statePensionAge - inputs.partnerA.currentAge
    const bSpSimYear = inputs.partnerB.statePensionAge - inputs.partnerB.currentAge
    if (aSpSimYear === bSpSimYear) {
      markers.push({
        simYear: aSpSimYear,
        label: 'SP',
        stroke: '#6b7280',
        strokeDasharray: '2 3',
        strokeWidth: 1,
        key: 'sp-both',
      })
    } else {
      markers.push(
        {
          simYear: aSpSimYear,
          label: 'SP A',
          stroke: '#6b7280',
          strokeDasharray: '2 3',
          strokeWidth: 1,
          key: 'sp-a',
        },
        {
          simYear: bSpSimYear,
          label: 'SP B',
          stroke: '#6b7280',
          strokeDasharray: '2 3',
          strokeWidth: 1,
          key: 'sp-b',
        }
      )
    }
  } else {
    markers.push({
      simYear: inputs.statePensionAge - inputs.currentAge,
      label: 'SP',
      stroke: '#6b7280',
      strokeDasharray: '2 3',
      strokeWidth: 1,
      key: 'sp',
    })
  }

  // One-off expense markers
  inputs.oneOffExpenses
    .filter(e => e.description)
    .forEach(e => {
      const expenseSimYear = e.year - currentYear
      if (expenseSimYear >= minSimYear && expenseSimYear <= maxSimYear) {
        markers.push({
          simYear: expenseSimYear,
          label: e.description!,
          stroke: '#ef4444',
          strokeDasharray: '3 3',
          strokeWidth: 1,
          labelColor: '#ef4444',
          labelSize: 9,
          key: `expense-${e.year}-${e.description}`,
        })
      }
    })

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
      {isCoupleMode ? (
        <>
          <path d={sippAPath} fill={CHART_COLORS.couple.sippA} opacity={0.7} />
          <path d={sippBPath} fill={CHART_COLORS.couple.sippB} opacity={0.7} />
          <path d={isaAPath} fill={CHART_COLORS.couple.isaA} opacity={0.7} />
          <path d={isaBPath} fill={CHART_COLORS.couple.isaB} opacity={0.7} />
          <path d={cashAPath} fill={CHART_COLORS.couple.cashA} opacity={0.7} />
          <path d={cashBPath} fill={CHART_COLORS.couple.cashB} opacity={0.7} />
        </>
      ) : (
        <>
          <path d={sippAPath} fill={CHART_COLORS.single.sipp} opacity={0.7} />
          <path d={isaAPath} fill={CHART_COLORS.single.isa} opacity={0.7} />
          <path d={cashAPath} fill={CHART_COLORS.single.cash} opacity={0.7} />
        </>
      )}

      {/* Lifecycle and expense markers */}
      {markers.map(marker => {
        const markerX = x(getDisplayValue(marker.simYear))
        return (
          <g key={marker.key}>
            <line
              x1={markerX}
              y1={padding.top}
              x2={markerX}
              y2={padding.top + chartH}
              stroke={marker.stroke}
              strokeDasharray={marker.strokeDasharray}
              strokeWidth={marker.strokeWidth}
            />
            <text
              x={markerX}
              y={padding.top - 6}
              textAnchor="middle"
              className={marker.labelColor ? undefined : 'fill-muted-foreground'}
              fill={marker.labelColor}
              fontSize={marker.labelSize ?? 10}
            >
              {marker.label}
            </text>
          </g>
        )
      })}

      {/* X-axis labels */}
      {data
        .filter(d => {
          const displayVal = getDisplayValue(d.simulationYear)
          return displayVal % 10 === 0 || d.simulationYear === minSimYear
        })
        .map(d => {
          const displayVal = getDisplayValue(d.simulationYear)
          return (
            <text
              key={d.simulationYear}
              x={x(displayVal)}
              y={padding.top + chartH + 20}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize={10}
            >
              {displayVal}
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
        {(isCoupleMode ? COUPLE_LEGEND_ITEMS : SINGLE_LEGEND_ITEMS).map((item, i) => (
          <g key={item.label} transform={`translate(${i * 78}, 0)`}>
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
