import type { MonthSnapshot } from '@/engine/types'

export interface ScenarioOverlayPoint {
  age: number
  totalNetWorth: number
}

export function formatMoney(n: number): string {
  if (n >= 1_000_000) return `£${(n / 1_000_000).toFixed(1)}m`
  if (n >= 1_000) return `£${(n / 1_000).toFixed(0)}k`
  return `£${n}`
}

export function monthsToAnnualStartOfYear(months: MonthSnapshot[], currentAge: number): ScenarioOverlayPoint[] {
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
