# Tasks: Working Simulation Engine

## 1. Project setup
- [x] Add Vitest and testing infrastructure to the app
- [x] Set up `src/engine/` directory for simulation logic (separate from UI)

## 2. Engine: building blocks
Each module is a pure function with unit tests.

- [x] **Tax calculator** — UK income tax bands, personal allowance. Given taxable income, return tax due. Bands grow with inflation.
- [x] **NI calculator** — Employee NI on salary. Salary sacrifice reduces NI-able pay.
- [x] **Growth** — Apply monthly nominal growth to a balance (equity rate, bond rate, or cash rate). Separate equity/bond portions within SIPP and S&S ISA using the allocation split.
- [x] **Inflation & real values** — Track cumulative inflation. Deflate nominal values to today's money.
- [x] **Contributions** — Monthly pension contribution (salary sacrifice: employee + employer, applied to SIPP). Monthly ISA contribution (split across S&S ISA and Cash ISA).
- [x] **Drawdown** — Given a monthly spending need and drawdown order, deplete accounts in order. Cash category: Cash Savings then Cash ISA. ISA/SIPP: pro-rata from equities and bonds. SIPP: gross up to cover tax (25% tax-free, 75% taxable at estimated marginal rate).
- [x] **Spending** — Annual spending in today's money, grown by inflation. Step-downs at specified ages. One-off expenses (pre-retirement from cash, post-retirement via drawdown).
- [x] **State pension** — Added as income from state pension age. Grows with inflation annually.

## 3. Engine: month-by-month simulation
- [x] **Simulation loop** — Iterate month by month from current age to longevity. Pre-retirement: apply salary growth, compute contributions, apply investment growth. Post-retirement: compute spending need, apply drawdown, apply growth on remaining balances, add state pension income. Output: monthly snapshots of all balances (nominal and real).
- [x] **Retirement transition** — Last contributions in month before retirement. Drawdowns begin in retirement month.
- [x] **SIPP marginal rate estimation** — At the start of each tax year, estimate marginal rate from fixed income (state pension if applicable). Use for SIPP gross-up calculations that year.
- [x] **Contribution limit validation** — Check annual ISA and SIPP contributions against limits (grown with inflation). Return warnings, don't enforce.

## 4. Engine: top-level / integration tests
Scenario-based tests that run the full simulation and check outcomes.

- [ ] **"Am I saving enough?"** — 40yo, £65k salary, 10%+5% pension, £500/mo ISA, retire at 60, spend £30k. Verify money lasts past 90 and balances are plausible at retirement.
- [ ] **"When can I retire?"** — Same person. Vary retirement age from 55 to 65. Verify that later retirement = longer funding.
- [ ] **Shortfall scenario** — Low savings, high spending. Verify money runs out and the age is reported correctly.
- [ ] **Drawdown order matters** — Same inputs but different drawdown orders. Verify SIPP-last defers more tax and produces a different (better) outcome than SIPP-first.
- [ ] **State pension impact** — Verify that reaching state pension age visibly reduces drawdown rate and extends funding.
- [ ] **Spending step-down** — Add a step-down at age 80. Verify spending drops and money lasts longer compared to flat spending.
- [ ] **One-off expense** — Large pre-retirement expense reduces cash savings. Large post-retirement expense causes a visible drawdown spike.
- [ ] **Growth rate sensitivity** — Higher equity growth = more money at retirement. Zero real growth = much earlier shortfall.
- [ ] **All values in today's money** — Verify that output values are deflated by cumulative inflation (e.g. a balance growing at exactly the inflation rate stays flat in real terms).

## 5. Wire engine into UI
- [ ] Replace `mockData.ts` with calls to the real simulation engine
- [ ] Map engine output (monthly) to annual snapshots for the data table (start of each age year)
- [ ] Ensure chart renders from engine output
- [ ] Verify <200ms recalculation on input change (perf target from PRD)

## 6. Input validation & warnings
- [ ] Validate inputs (no negative ages, retirement after current age, etc.)
- [ ] Warn if ISA contributions exceed annual limit
- [ ] Warn if SIPP contributions exceed annual allowance
- [ ] Warn if one-off expense exceeds cash savings (pre-retirement)

## 7. Local storage persistence
- [ ] Save inputs to localStorage on change
- [ ] Load inputs from localStorage on app start (with graceful fallback to defaults)
