import type { Inputs } from '../../types'
import type { PercentileBand } from '../../engine/types'
import type { ScenarioOverlayPoint } from './chartUtils'
import { formatMoney } from './chartConstants'

export function FanChart({
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
