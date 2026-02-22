# Tasks: Backtesting

See `docs/prd/07-backtesting.md` for the full feature design.

## 10. Data processing script
Build-time script that processes the 4 raw CSV files into a single typed JSON file the engine can import.

- [x] **Parse raw CSVs** — Read `ftse-allshare-price.csv` (monthly close prices), `uk-cpi-fred.csv` (CPI index), `uk-gilt-yield-10y-fred.csv` (10y gilt yield %), `boe-base-rate.csv` (daily base rate → sample monthly)
- [x] **Compute monthly returns** — Equity: month-over-month FTSE All-Share price return + 3.5%/12 assumed dividend yield. Bonds: coupon income (yield/12) + price change (−duration × Δyield, using ~8y duration for 10y gilt). Cash: monthly BoE base rate − 0.5% spread, converted to monthly. Inflation: month-over-month CPI change.
- [x] **Output `app/src/data/historicalReturns.json`** — Array of `{ year, month, equityReturn, bondReturn, cashReturn, inflationRate }` covering the overlapping window (1985–present)
- [x] **Tests** — Verify parsed row counts, spot-check a few known months against raw data, check all values are within plausible ranges

## 11. Historical data types and scenario builder
TypeScript module that loads the processed data and builds per-scenario rate overrides.

- [x] **Types** — `HistoricalMonth` (matching the JSON shape), `MonthlyRateOverrides` (the rates the engine needs for one month: equityRate, bondRate, cashRate, inflationRate)
- [x] **Scenario builder** — Given a scenario start year, return an array of `MonthlyRateOverrides` for the available historical months. No padding — the rate provider (task 12) handles fallback to fixed assumptions when data runs out.
- [x] **Available scenarios list** — Function that returns the range of valid start years based on the data length and a minimum simulation duration
- [x] **Tests** — Scenario starting at known year returns correct rates for first/last months; available scenarios list is correct

## 12. Engine: rate provider abstraction
Replace hardcoded rate reads from `inputs` with a `RateProvider` function that `simulate()` calls each month.

- [x] **Define `MonthlyRates` and `RateProvider`** — `MonthlyRates { equityRate, bondRate, cashRate, inflationRate }` (annual nominal). `RateProvider = (monthIndex: number) => MonthlyRates`. Add to engine types.
- [x] **`fixedRateProvider(inputs)`** — Returns a `RateProvider` that returns the same rates every month from the user's inputs. This is what deterministic mode uses.
- [x] **Refactor `simulate()`** — Take a `RateProvider` parameter instead of reading rates directly from `inputs`. Use it for `applyMonthlyGrowth()` and `advanceInflation()`. Existing tests pass unchanged (default provider wraps inputs with `fixedRateProvider`).
- [x] **`historicalRateProvider(scenarioOverrides, fallback)`** — Returns a `RateProvider` that uses historical monthly rate overrides (converted to annual equivalents). Falls back to fixed rates when data runs out.
- [x] **Tests** — Fixed provider returns constant rates. Historical provider returns correct rates for given scenario and falls back correctly. Simulation with explicit fixed provider matches default deterministic behaviour. Simulation with historical provider uses historical then fallback rates.

## 13. Backtesting runner and aggregation
Module that runs all scenarios and computes aggregate statistics.

- [x] **`runBacktest(inputs, historicalData)`** — Runs `simulate()` once per scenario start year. Returns array of `{ startYear, result: SimulationResult }`.
- [x] **Aggregate stats** — From the array of results, compute: percentile bands (10th/25th/50th/75th/90th) of total net worth (real) at each age, success rate (% of scenarios where money lasts to longevity), worst-case scenario (start year and age money runs out).
- [x] **Backtesting result types** — `BacktestResult` with scenario results, percentile bands, success rate, worst case info.
- [x] **Tests** — With synthetic historical data (e.g. 5 scenarios), verify percentile computation, success rate calculation, worst case identification.

## 14. UI: mode toggle and input panel changes
- [x] **Mode toggle** — Add a toggle at the top of the results panel to switch between "Fixed assumptions" and "Backtesting"
- [x] **Grey out overridden fields** — When backtesting is active, disable and visually dim the inflation, equity growth, bond growth, and cash growth inputs. Show a note explaining historical data is used instead.
- [x] **Wire up computation** — When backtesting mode is active, call `runBacktest()` instead of `simulate()`. Store the backtesting result in state.

## 15. UI: fan chart and summary stats
- [x] **Fan chart** — When in backtesting mode, replace the stacked area chart with a fan chart showing percentile bands (10th/25th/50th/75th/90th) of total net worth over time. Use shaded bands with the median as a solid line.
- [x] **Summary stats** — Replace the deterministic summary bar with backtesting stats: success rate ("Your money lasts to your target age in X% of historical scenarios"), worst case ("In the worst scenario (retiring in [year]), money runs out at age [N]").

## 16. UI: scenario selector
- [x] **Scenario list/timeline** — Add a small timeline or list showing each historical start year below the fan chart
- [x] **Scenario overlay** — Clicking a start year overlays that individual scenario's net worth line on the fan chart
- [x] **Data table integration** — When a scenario is selected, populate the data table with that scenario's monthly numbers (same format as deterministic mode)
