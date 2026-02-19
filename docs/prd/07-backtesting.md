# Backtesting (Post-MVP)

This document captures the full design for backtesting mode, to be implemented once the MVP deterministic projection is working.

## Concept

Backtesting runs multiple simulations using historical UK stock market returns and inflation data. Each scenario answers: "What if I had retired in year X and experienced the real market returns and inflation from year X onwards?"

This gives the user a realistic sense of how their plan holds up across a range of historical conditions — including retiring into the dot-com crash (2000) or the financial crisis (2008).

## Modelling Approach

- A "scenario" is a simulation starting from a given historical year, using actual stock market returns and inflation for the subsequent years
- Approximately 100 scenarios covering the available historical data range
- The cleanest overlapping window with all UK data is roughly 1985 to present (~40 years). Using modelled bond returns from gilt yields extends this back to 1975.
- Within each scenario, the month-by-month simulation engine is the same as deterministic mode, but with historical data replacing fixed assumptions

### What Gets Overridden

In backtesting mode, the following assumptions are replaced by historical data:

| Parameter | Deterministic | Backtesting |
|-----------|--------------|-------------|
| Inflation | User-specified (default 2%) | Historical UK CPI |
| Stock market growth | User-specified (default 6%) | Historical equity total returns |

### Open Design Questions

- **Bond returns:** should these also be driven by historical gilt yield data, or remain as a fixed assumption?
- **Cash rates:** should these be driven by historical BoE base rate data, or remain fixed?
- **Equity total return data:** the FTSE price indices exclude dividends. Options: (1) FTSE price + assumed dividend yield (~3.5%), (2) MSCI World total return converted to GBP, (3) Shiller S&P 500 with dividends for longer history. See `data/raw/README.md` for available data.

### Historical Data

The raw historical data files are described in `data/raw/README.md`. Key datasets:

- UK CPI (FRED, 1955–2025) — for historical inflation
- FTSE 100 / All-Share price indices (1985–2026) — equity returns (price only)
- 10-year gilt yields (FRED, 1960–2026) — for modelling bond returns
- BoE base rate (1975–2026) — for modelling cash returns
- MSCI World total return in USD (2000–2026) + GBP/USD FX — alternative equity series
- Shiller S&P 500 with dividends (1871–2023) — longest total return series

## Feature Spec

### User Experience

- **Mode toggle** at the top of the results panel to switch between "Fixed assumptions" and "Backtesting"
- When backtesting is active, the assumptions panel greys out fields that are overridden (inflation, stock market growth) with a note explaining that historical data is being used instead
- All other inputs (contributions, drawdown order, spending, etc.) remain editable and apply to every scenario

### Results Display

- **Fan chart:** replaces the stacked area chart. Shows percentile bands (10th / 25th / 50th / 75th / 90th) of total net worth over time
- **Success rate:** "Your money lasts to your target age in X% of historical scenarios"
- **Worst case:** "In the worst scenario (retiring in [year]), money runs out at age [N]"
- **Scenario selector:** a small timeline or list showing each historical start year. Clicking one overlays that specific scenario on the main chart and populates the data table with that scenario's numbers

### Performance

- All ~100 backtesting scenarios should complete within 2 seconds

## User Scenario

> User is 52, has £300k in SIPP, £120k in ISA, £30k cash. They want to spend £35k/year in retirement. They switch to backtesting mode and vary the retirement age slider to find the earliest date that works across most historical scenarios. They click the 2000 start year to see how a dot-com crash retirement plays out in detail.
