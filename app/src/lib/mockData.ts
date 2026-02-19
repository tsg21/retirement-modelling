import type { Inputs, YearProjection } from '../types'

/**
 * Generate mock projection data from inputs.
 * This is NOT the real simulation engine — just enough to make the UI feel alive.
 */
export function generateProjection(inputs: Inputs): YearProjection[] {
  const data: YearProjection[] = []

  let sipp = inputs.sippBalance
  let isa = inputs.ssISABalance + inputs.cashISABalance
  let cash = inputs.cashSavingsBalance
  let salary = inputs.salary

  const realEquityGrowth = (inputs.equityGrowthPct - inputs.inflationPct) / 100
  const realBondGrowth = (inputs.bondRatePct - inputs.inflationPct) / 100
  const realCashGrowth = (inputs.cashRatePct - inputs.inflationPct) / 100
  const equityPct = inputs.stockBondSplitPct / 100

  // Blended real growth for SIPP and ISA
  const blendedGrowth = equityPct * realEquityGrowth + (1 - equityPct) * realBondGrowth

  const statePension = inputs.statePensionOverride ?? inputs.statePensionAmount

  for (let age = inputs.currentAge; age <= inputs.longevity; age++) {
    const isRetired = age >= inputs.retirementAge
    const hasStatePension = age >= inputs.statePensionAge

    let contributions = 0
    let spending = 0
    let taxPaid = 0

    if (!isRetired) {
      // Pre-retirement: grow balances, add contributions
      const pensionContrib = salary * (inputs.employeePensionPct + inputs.employerPensionPct) / 100
      const isaContrib = inputs.monthlyISA * 12
      contributions = pensionContrib + isaContrib

      sipp = sipp * (1 + blendedGrowth) + pensionContrib
      isa = isa * (1 + blendedGrowth) + isaContrib
      cash = cash * (1 + realCashGrowth)

      salary = salary * (1 + (inputs.salaryGrowthPct - inputs.inflationPct) / 100)
    } else {
      // Post-retirement: grow balances, then draw down spending
      sipp = sipp * (1 + blendedGrowth)
      isa = isa * (1 + blendedGrowth)
      cash = cash * (1 + realCashGrowth)

      // Determine spending for this year
      let annualSpend = inputs.annualSpending
      for (const step of inputs.spendingStepDowns) {
        if (age >= step.age) annualSpend = step.amount
      }
      spending = annualSpend

      // Subtract state pension from spending need
      let drawdownNeed = spending
      if (hasStatePension) {
        drawdownNeed = Math.max(0, drawdownNeed - statePension)
      }

      // Draw down in order
      let remaining = drawdownNeed
      for (const cat of inputs.drawdownOrder) {
        if (remaining <= 0) break
        if (cat === 'Cash') {
          const drawn = Math.min(cash, remaining)
          cash -= drawn
          remaining -= drawn
        } else if (cat === 'ISA') {
          const drawn = Math.min(isa, remaining)
          isa -= drawn
          remaining -= drawn
        } else if (cat === 'SIPP') {
          // Gross up: 75% taxable at ~20%
          const grossUp = remaining / (1 - 0.20 * 0.75)
          const drawn = Math.min(sipp, grossUp)
          sipp -= drawn
          taxPaid = (drawn - remaining) > 0 ? drawn - remaining : 0
          remaining = drawn < grossUp ? remaining - (drawn * (1 - 0.20 * 0.75)) : 0
        }
      }
    }

    // One-off expenses
    for (const expense of inputs.oneOffExpenses) {
      const expenseYear = new Date().getFullYear() + (age - inputs.currentAge)
      if (expense.year === expenseYear) {
        if (!isRetired) {
          cash = Math.max(0, cash - expense.amount)
        } else {
          spending += expense.amount
        }
      }
    }

    // Floor at zero
    sipp = Math.max(0, sipp)
    isa = Math.max(0, isa)
    cash = Math.max(0, cash)

    data.push({
      age,
      salary: isRetired ? 0 : Math.round(salary),
      contributions: Math.round(contributions),
      spending: Math.round(spending),
      sippBalance: Math.round(sipp),
      isaBalance: Math.round(isa),
      cashBalance: Math.round(cash),
      totalNetWorth: Math.round(sipp + isa + cash),
      taxPaid: Math.round(taxPaid),
    })
  }

  return data
}

export function computeSummary(data: YearProjection[], inputs: Inputs) {
  const retirementRow = data.find(d => d.age === inputs.retirementAge)
  const totalAtRetirement = retirementRow?.totalNetWorth ?? 0

  const runsOutRow = data.find(d => d.age >= inputs.retirementAge && d.totalNetWorth <= 0)
  const runsOutAge = runsOutRow?.age ?? null

  const yearsFunded = runsOutAge
    ? runsOutAge - inputs.retirementAge
    : inputs.longevity - inputs.retirementAge

  const outcome = runsOutAge
    ? `Shortfall from age ${runsOutAge}`
    : `Money lasts to age ${inputs.longevity}`

  const status: 'green' | 'amber' | 'red' = runsOutAge
    ? runsOutAge - inputs.retirementAge < 20 ? 'red' : 'amber'
    : 'green'

  return { totalAtRetirement, yearsFunded, outcome, status }
}
