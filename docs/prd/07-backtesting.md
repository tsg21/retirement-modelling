# Backtesting

Backtesting mode lets users stress-test their retirement plan against real historical market conditions.

## Concept

Backtesting runs multiple simulations using historical UK stock market returns and inflation data. Each scenario answers: "What if I had retired in year X and experienced the real market returns and inflation from year X onwards?"

This gives the user a realistic sense of how their plan holds up across a range of historical conditions — including retiring into the dot-com crash (2000) or the financial crisis (2008).

## Modelling Approach

- A "scenario" is a simulation starting from a given historical year, using actual stock market returns and inflation for the subsequent years
- Approximately 100 scenarios covering the available historical data range
- The cleanest overlapping window with all UK data is roughly 1985 to present (~40 years). Using modelled bond returns from gilt yields extends this back to 1975.
- Within each scenario, the month-by-month simulation engine is the same as deterministic mode, but with historical data replacing fixed assumptions
- When a scenario's simulation extends beyond the available historical data, the engine falls back to the user's fixed assumptions (equity growth, bond growth, cash growth, inflation) for the remaining months

### What Gets Overridden

In backtesting mode, the following assumptions are replaced by historical data:

| Parameter | Deterministic | Backtesting |
|-----------|--------------|-------------|
| Inflation | User-specified (default 2%) | Historical UK CPI |
| Equity growth | User-specified (default 6%) | FTSE All-Share price return + assumed 3.5% dividend yield |
| Bond growth | User-specified (default 2%) | Historical gilt total return (coupon + price change from yield movements) |
| Cash growth | User-specified (default 3%) | Historical BoE base rate minus 0.5% spread |

### Historical Data

The raw historical data files are described in `data/raw/README.md`. Key datasets:

- **UK CPI** (FRED, 1955–2025) — historical inflation
- **FTSE All-Share price index** (1985–2026) — equity price returns; combined with an assumed 3.5% annual dividend yield to approximate total return. Chosen over MSCI World (only from 2000) and Shiller S&P 500 (US-only) to keep data UK-focused with coverage back to 1985.
- **10-year gilt yields** (FRED, 1960–2026) — bond total return modelled as coupon income (yield/12 per month) plus price change from yield movements (using approximate duration)
- **BoE base rate** (1975–2026) — cash savings return modelled as base rate minus a spread (0.5%)

## Feature Spec

### User Experience

- **Mode toggle** at the top of the results panel to switch between "Fixed assumptions" and "Backtesting"
- When backtesting is active, the assumptions panel greys out fields that are overridden (inflation, equity growth, bond growth, cash growth) with a note explaining that historical data is being used instead
- All other inputs (contributions, drawdown order, spending, etc.) remain editable and apply to every scenario

### Results Display

- **Fan chart:** replaces the stacked area chart. Shows percentile bands (10th / 25th / 50th / 75th / 90th) of total net worth over time
- **Success rate:** "Your money lasts to your target age in X% of historical scenarios"
- **Worst case:** "In the worst scenario (retiring in [year]), money runs out at age [N]"
- **Scenario selector:** a small timeline or list showing each historical start year. Clicking one overlays that specific scenario on the main chart and populates the data table with that scenario's numbers

### Performance

- All ~100 backtesting scenarios should complete within 5 seconds

## User Scenario

> User is 52, has £300k in SIPP, £120k in ISA, £30k cash. They want to spend £35k/year in retirement. They switch to backtesting mode and vary the retirement age slider to find the earliest date that works across most historical scenarios. They click the 2000 start year to see how a dot-com crash retirement plays out in detail.
