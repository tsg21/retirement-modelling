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

- [x] **"Am I saving enough?"** — 40yo, £65k salary, 10%+5% pension, £500/mo ISA, retire at 60, spend £30k. Verify money lasts past 90 and balances are plausible at retirement.
- [x] **"When can I retire?"** — Same person. Vary retirement age from 55 to 65. Verify that later retirement = longer funding.
- [x] **Shortfall scenario** — Low savings, high spending. Verify money runs out and the age is reported correctly.
- [x] **Drawdown order matters** — Same inputs but different drawdown orders. Verify SIPP-last defers more tax and produces a different (better) outcome than SIPP-first.
- [x] **State pension impact** — Verify that reaching state pension age visibly reduces drawdown rate and extends funding.
- [x] **Spending step-down** — Add a step-down at age 80. Verify spending drops and money lasts longer compared to flat spending.
- [x] **One-off expense** — Large pre-retirement expense reduces cash savings. Large post-retirement expense causes a visible drawdown spike.
- [x] **Growth rate sensitivity** — Higher equity growth = more money at retirement. Zero real growth = much earlier shortfall.
- [x] **All values in today's money** — Verify that output values are deflated by cumulative inflation (e.g. a balance growing at exactly the inflation rate stays flat in real terms).

## 5. Wire engine into UI
- [x] Replace `mockData.ts` with calls to the real simulation engine
- [x] Map engine output (monthly) to annual snapshots for the data table (start of each age year)
- [x] Ensure chart renders from engine output
- [x] Verify <200ms recalculation on input change (perf target from PRD)

## 6. Input validation & warnings
- [x] Validate inputs (no negative ages, retirement after current age, etc.)
- [x] Warn if ISA contributions exceed annual limit
- [x] Warn if SIPP contributions exceed annual allowance
- [x] Warn if one-off expense exceeds cash savings (pre-retirement)

## 7. Local storage persistence
- [x] Save inputs to localStorage on change
- [x] Load inputs from localStorage on app start (with graceful fallback to defaults)

## 8. Reset to defaults
- [x] Add a "Reset to defaults" button at the bottom of the input panel (subtle/secondary style)
- [x] Add a confirmation dialog on click ("Reset all inputs to defaults? This cannot be undone.")
- [x] On confirmation, replace all inputs with `DEFAULT_INPUTS` and clear localStorage
- [x] Scroll input panel to top after reset

## 9. One-off expense descriptions
- [x] Add optional `description` field to `OneOffExpense` type
- [x] Add description text input to InputPanel one-off expense rows
- [x] Render labelled vertical lines on the chart for one-off expenses that have a description
- [x] Handle localStorage migration (existing data without `description` still loads correctly)

---

# Tasks: Backtesting

See `docs/prd/07-backtesting.md` for the full feature design.

## 10. Data processing script
Build-time script that processes the 4 raw CSV files into a single typed JSON file the engine can import.

- [ ] **Parse raw CSVs** — Read `ftse-allshare-price.csv` (monthly close prices), `uk-cpi-fred.csv` (CPI index), `uk-gilt-yield-10y-fred.csv` (10y gilt yield %), `boe-base-rate.csv` (daily base rate → sample monthly)
- [ ] **Compute monthly returns** — Equity: month-over-month FTSE All-Share price return + 3.5%/12 assumed dividend yield. Bonds: coupon income (yield/12) + price change (−duration × Δyield, using ~8y duration for 10y gilt). Cash: monthly BoE base rate − 0.5% spread, converted to monthly. Inflation: month-over-month CPI change.
- [ ] **Output `app/src/data/historicalReturns.json`** — Array of `{ year, month, equityReturn, bondReturn, cashReturn, inflationRate }` covering the overlapping window (1985–present)
- [ ] **Tests** — Verify parsed row counts, spot-check a few known months against raw data, check all values are within plausible ranges

## 11. Historical data types and scenario builder
TypeScript module that loads the processed data and builds per-scenario rate overrides.

- [ ] **Types** — `HistoricalMonth` (matching the JSON shape), `MonthlyRateOverrides` (the rates the engine needs for one month: equityRate, bondRate, cashRate, inflationRate)
- [ ] **Scenario builder** — Given a scenario start year, return an array of `MonthlyRateOverrides` for each month of the simulation. When historical data runs out, repeat the last available year's data (or use the user's fixed assumptions as fallback).
- [ ] **Available scenarios list** — Function that returns the range of valid start years based on the data length and a minimum simulation duration
- [ ] **Tests** — Scenario starting at known year returns correct rates for first/last months; data exhaustion fallback works; available scenarios list is correct

## 12. Engine: rate provider abstraction
Replace hardcoded rate reads from `inputs` with a `RateProvider` function that `simulate()` calls each month.

- [ ] **Define `MonthlyRates` and `RateProvider`** — `MonthlyRates { equityRate, bondRate, cashRate, inflationRate }` (annual nominal). `RateProvider = (monthIndex: number) => MonthlyRates`. Add to engine types.
- [ ] **`fixedRateProvider(inputs)`** — Returns a `RateProvider` that returns the same rates every month from the user's inputs. This is what deterministic mode uses.
- [ ] **Refactor `simulate()`** — Take a `RateProvider` parameter instead of reading rates directly from `inputs`. Use it for `applyMonthlyGrowth()` and `advanceInflation()`. Existing tests should pass unchanged by wrapping inputs with `fixedRateProvider`.
- [ ] **`historicalRateProvider(data, scenarioStartIndex)`** — Returns a `RateProvider` that looks up `data[scenarioStartIndex + monthIndex]`. Falls back to last available month if data runs out.
- [ ] **Tests** — Fixed provider returns constant rates. Historical provider returns correct rates for given scenario. Simulation with fixed provider matches previous deterministic behaviour.

## 13. Backtesting runner and aggregation
Module that runs all scenarios and computes aggregate statistics.

- [ ] **`runBacktest(inputs, historicalData)`** — Runs `simulate()` once per scenario start year. Returns array of `{ startYear, result: SimulationResult }`.
- [ ] **Aggregate stats** — From the array of results, compute: percentile bands (10th/25th/50th/75th/90th) of total net worth (real) at each age, success rate (% of scenarios where money lasts to longevity), worst-case scenario (start year and age money runs out).
- [ ] **Backtesting result types** — `BacktestResult` with scenario results, percentile bands, success rate, worst case info.
- [ ] **Tests** — With synthetic historical data (e.g. 5 scenarios), verify percentile computation, success rate calculation, worst case identification.

## 14. UI: mode toggle and input panel changes
- [ ] **Mode toggle** — Add a toggle at the top of the results panel to switch between "Fixed assumptions" and "Backtesting"
- [ ] **Grey out overridden fields** — When backtesting is active, disable and visually dim the inflation, equity growth, bond growth, and cash growth inputs. Show a note explaining historical data is used instead.
- [ ] **Wire up computation** — When backtesting mode is active, call `runBacktest()` instead of `simulate()`. Store the backtesting result in state.

## 15. UI: fan chart and summary stats
- [ ] **Fan chart** — When in backtesting mode, replace the stacked area chart with a fan chart showing percentile bands (10th/25th/50th/75th/90th) of total net worth over time. Use shaded bands with the median as a solid line.
- [ ] **Summary stats** — Replace the deterministic summary bar with backtesting stats: success rate ("Your money lasts to your target age in X% of historical scenarios"), worst case ("In the worst scenario (retiring in [year]), money runs out at age [N]").

## 16. UI: scenario selector
- [ ] **Scenario list/timeline** — Add a small timeline or list showing each historical start year below the fan chart
- [ ] **Scenario overlay** — Clicking a start year overlays that individual scenario's net worth line on the fan chart
- [ ] **Data table integration** — When a scenario is selected, populate the data table with that scenario's monthly numbers (same format as deterministic mode)
