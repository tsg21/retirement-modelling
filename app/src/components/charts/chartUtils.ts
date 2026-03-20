import type { MonthSnapshot } from '../../engine/types'

export interface ScenarioOverlayPoint {
  age: number
  totalNetWorth: number
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
