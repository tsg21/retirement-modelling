# Simulation Engine

Pure TypeScript simulation engine for retirement projections. No React dependencies — the engine is a standalone library consumed by the UI layer.

## Architecture

```
engine/
  types.ts          — Shared types (inputs, outputs, account balances)
  tax.ts            — UK income tax bands and computation
  ni.ts             — Employee National Insurance (salary sacrifice)
  growth.ts         — Monthly investment growth (equity, bond, cash)
  inflation.ts      — Cumulative inflation tracking, nominal → real conversion
  contributions.ts  — Monthly pension and ISA contributions
  drawdown.ts       — Post-retirement drawdown logic with SIPP gross-up
  spending.ts       — Spending target, step-downs, one-off expenses
  statePension.ts   — State pension income from state pension age
  validation.ts     — Input validation and contribution limit warnings
  simulate.ts       — Month-by-month simulation loop (orchestrator)
```

## Module Responsibilities

### tax.ts
Compute UK income tax given annual taxable income.
- Current bands: personal allowance (£12,570), basic rate 20% (to £50,270), higher rate 40% (to £125,140), additional rate 45%
- Bands grow with inflation each year from their current values
- Monthly tax = apply annual bands scaled by 1/12 to monthly taxable income
- Used post-retirement only (pre-retirement tax is not computed)

### ni.ts
Compute employee Class 1 NI on salary.
- Salary sacrifice reduces NI-able pay (employee contribution subtracted before NI)
- Employer NI savings not modelled (MVP simplification)
- Used only for contribution limit validation, not for cash flow (pre-retirement take-home pay is not tracked)

### growth.ts
Apply monthly nominal growth to account balances.
- SIPP and S&S ISA: equity portion grows at equity rate, bond portion at bond rate. Target allocation is maintained each month (no drift).
- Cash ISA and Cash Savings: both grow at cash interest rate.
- All rates are annual nominal rates, converted to monthly: `(1 + annual)^(1/12) - 1`

### inflation.ts
Track cumulative inflation and convert between nominal and real values.
- Cumulative inflation compounds monthly from the simulation start
- `toRealValue(nominal, cumulativeInflation)` deflates a nominal value to today's money
- Used for all output values shown to the user

### contributions.ts
Compute monthly contributions to each account (pre-retirement only).
- SIPP: (employee% + employer%) × salary / 12. Salary sacrifice means the employee portion comes off gross salary.
- S&S ISA: monthlyISA × ssISASplitPct / 100
- Cash ISA: monthlyISA × (1 - ssISASplitPct / 100)
- Salary grows annually at the salary growth rate

### drawdown.ts
Deplete accounts to meet monthly spending needs (post-retirement only).
- Process drawdown categories in user-specified order
- **Cash**: draw from Cash Savings first, then Cash ISA
- **ISA**: draw from S&S ISA, pro-rata from equities and bonds
- **SIPP**: gross up withdrawal to cover tax. Formula: `grossDrawdown = spendingNeed / (1 - marginalRate × 0.75)`. Each withdrawal is 25% tax-free, 75% taxable.
- Marginal rate estimated at start of each tax year from known fixed income (state pension if applicable). The rate is the tax band that applies to the next pound above that fixed income.
- Accounts cannot go below zero; if a category is exhausted, move to the next

### spending.ts
Determine the monthly spending amount for a given month.
- Base: annual spending / 12, in nominal terms (grown by cumulative inflation from today's-money input)
- Step-downs: if the person has reached a step-down age, use that amount instead (also grown by inflation from today's money)
- One-off expenses: in the month they occur, add the expense amount (grown by inflation) to that month's spending need
- Pre-retirement one-off expenses: subtracted directly from cash savings (capped at zero)

### statePension.ts
Add state pension income from state pension age.
- Annual amount specified in today's money, grown by inflation each year
- Paid monthly (annual / 12)
- Reduces the drawdown need in each month it applies

### validation.ts
Validate inputs and warn about contribution limits.
- ISA: annual contributions (S&S ISA + Cash ISA) vs £20k limit (grown with inflation)
- SIPP: annual contributions (employee + employer) vs £60k limit or 100% of earnings (grown with inflation)
- Returns warning messages, does not modify the simulation

### simulate.ts
The main orchestrator. Runs the month-by-month loop.

**Pre-retirement month (age < retirement age):**
1. Apply salary growth (annually, at start of each year)
2. Compute monthly contributions
3. Add contributions to respective accounts
4. Apply investment growth to all accounts
5. Handle pre-retirement one-off expenses (subtract from cash savings)

**Retirement month transition:**
- Last contributions occur in the month before retirement
- Drawdowns begin in the retirement month

**Post-retirement month (age ≥ retirement age):**
1. Estimate marginal tax rate (at start of each tax year)
2. Compute monthly spending need (including step-downs and one-off expenses)
3. Subtract state pension income (if applicable) from spending need
4. Execute drawdown from accounts in specified order
5. Apply investment growth to remaining balances

**Output:**
- Array of monthly snapshots: all account balances (nominal and real), income, spending, tax, contributions
- Summary: retirement pot total, age money runs out (if applicable), years funded

## Testing Strategy

### Unit tests (per module)
Each module has its own test file testing the pure function in isolation:
- `tax.test.ts` — known income → known tax amounts; band inflation
- `ni.test.ts` — salary sacrifice reduces NI
- `growth.test.ts` — monthly compounding matches expected annual return
- `contributions.test.ts` — correct amounts flow to correct accounts
- `drawdown.test.ts` — order respected; SIPP gross-up correct; accounts deplete correctly
- `spending.test.ts` — step-downs apply at correct age; one-offs in correct month
- `inflation.test.ts` — cumulative inflation compounds correctly; real values deflate

### Integration tests (simulate.test.ts)
Full simulation runs with known inputs, checking outcomes:
- **"Am I saving enough?"** — plausible balances and longevity
- **"When can I retire?"** — later retirement = more funding years
- **Shortfall scenario** — money runs out at expected age
- **Drawdown order impact** — SIPP-last produces better outcome than SIPP-first
- **State pension impact** — reduces drawdown rate, extends funding
- **Spending step-down** — lower spending extends funding
- **One-off expenses** — visible impact on balances
- **Growth rate sensitivity** — higher growth = more money
- **Real vs nominal** — balance growing at inflation stays flat in real terms
