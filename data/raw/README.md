# Raw Backtesting Data

Historical monthly data for the retirement backtesting engine. Downloaded February 2026.

## Files

| File | What it is | Source | Range | Notes |
|------|-----------|--------|-------|-------|
| uk-cpi-fred.csv | UK CPI index (2015=100) | FRED | 1955 - Mar 2025 | Monthly, clean CSV. Best for backtesting. |
| uk-cpi-ons.csv | UK CPI index (2015=100) | ONS | 1988 - Jan 2026 | Annual, quarterly, then monthly sections. Canonical UK source. |
| uk-gilt-yield-10y-fred.csv | 10-year gilt yield (%) | FRED | 1960 - Jan 2026 | Yield, not total return. Need to model returns from yield changes. |
| boe-base-rate.csv | Bank of England base rate | BoE | 1975 - Feb 2026 | Daily granularity. Model cash savings as base rate minus spread. |
| ftse100-price.csv | FTSE 100 price index | Yahoo Finance | 1985 - Feb 2026 | Price only - excludes dividends. |
| ftse-allshare-price.csv | FTSE All-Share price index | Yahoo Finance | 1985 - Feb 2026 | Price only - excludes dividends. |
| sp500-price.csv | S&P 500 price index | Yahoo Finance | 1985 - Feb 2026 | Price only, USD denominated. |
| shiller-sp500.xls | S&P 500 + dividends + CPI | Shiller/Yale | 1871 - 2023 | XLS format. Contains price, dividends, earnings, CPI, interest rates. Can compute total return. |
| msci-world-total-return-usd.xls | MSCI World gross total return (USD) | MSCI | Dec 2000 - Jan 2026 | XLS format. 302 monthly rows. Manually downloaded from msci.com. |
| msci-world-etf-swda.csv | iShares MSCI World ETF (GBP) | Yahoo Finance | 2009 - Feb 2026 | Accumulating ETF so price reflects total return. Only ~16 years of history. |
| uk-gilts-etf-iglt.csv | iShares UK Gilts ETF | Yahoo Finance | 2008 - Feb 2026 | Total return ETF. Only ~18 years of history. |
| ishares-ftse100-etf.csv | iShares Core FTSE 100 ETF | Yahoo Finance | 2009 - Feb 2026 | Distributing ETF (price only, not total return). |
| vanguard-ftse100-etf.csv | Vanguard FTSE 100 ETF | Yahoo Finance | 2012 - Feb 2026 | Distributing ETF (price only, not total return). |
| gbpusd-fx.csv | GBP/USD exchange rate | Yahoo Finance | 2003 - Feb 2026 | For converting USD-denominated data to GBP. |

## Key gaps

**UK equity total return** is the main gap. The FTSE 100 price index excludes dividends, which historically account for roughly half of total equity returns. Options:

1. Use the price index plus an assumed dividend yield (~3.5%) to approximate total return.
2. Use MSCI World total return (we have USD from 2000; convert to GBP using FX data).
3. Use the Shiller S&P 500 data (1871+) with dividends to compute total return for longer history.

## Practical backtesting window

The cleanest overlapping window with all UK data is roughly **1985 to present** (~40 years, ~100 rolling retirement scenarios). Using modelled bond returns from gilt yields extends this back to **1975**.

## Re-downloading

FRED, ONS, and BoE data can be re-fetched via direct CSV URLs (no auth needed). Yahoo Finance data requires the `yfinance` Python library (cookie/crumb handling). The Shiller XLS is a direct download from Yale.
