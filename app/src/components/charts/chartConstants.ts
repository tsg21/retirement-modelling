export function formatMoney(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`
  return `£${n}`
}

export const CHART_COLORS = {
  couple: {
    sippA: '#1d4ed8',
    sippB: '#60a5fa',
    isaA: '#15803d',
    isaB: '#4ade80',
    cashA: '#b45309',
    cashB: '#fbbf24',
  },
  single: {
    sipp: '#3b82f6',
    isa: '#22c55e',
    cash: '#f59e0b',
  },
} as const

export const COUPLE_LEGEND_ITEMS = [
  { label: 'SIPP A', color: CHART_COLORS.couple.sippA },
  { label: 'SIPP B', color: CHART_COLORS.couple.sippB },
  { label: 'ISA A', color: CHART_COLORS.couple.isaA },
  { label: 'ISA B', color: CHART_COLORS.couple.isaB },
  { label: 'Cash A', color: CHART_COLORS.couple.cashA },
  { label: 'Cash B', color: CHART_COLORS.couple.cashB },
] as const

export const SINGLE_LEGEND_ITEMS = [
  { label: 'SIPP', color: CHART_COLORS.single.sipp },
  { label: 'ISA', color: CHART_COLORS.single.isa },
  { label: 'Cash', color: CHART_COLORS.single.cash },
] as const
