# Financial Model

## Income Sources

- Salary from employment (prior to retirement)
- Interest income from savings
- Investment income from stocks
- Income from bonds
- State pension

## Account Types (Wrappers)

The model tracks assets across separate account types, each with different tax treatment:

- **SIPP (DC Pension)** - employer and employee contributions via salary sacrifice; tax relief on contributions; taxed as income on withdrawal (except 25% tax-free element)
- **Stocks & Shares ISA** - post-tax contributions; tax-free growth and withdrawals; subject to annual contribution limit
- **Cash ISA** - post-tax contributions; tax-free interest; subject to annual contribution limit (shared with S&S ISA)
- **Cash Savings** - post-tax; interest taxable as income

### Starting Balances

User provides current balance for each account type.

### Contribution Limits

- **ISA** - annual contribution limit (currently £20k, shared across Cash ISA and S&S ISA).
- **SIPP** - annual allowance (currently £60k or 100% of earnings, whichever is lower). Employer contributions count towards this limit.

Limits assume current values and grow with inflation.

### Contributions (Pre-Retirement)

User specifies how their savings are allocated across wrappers:
- X% of salary into SIPP via salary sacrifice (with employer match if applicable). Salary sacrifice reduces gross salary, saving employee NI. (Employer NI savings are not modelled in MVP.)
- £Y per month into ISA (split between S&S ISA and Cash ISA as specified by user)

The model validates that stated contributions don't exceed ISA or SIPP annual limits and warns the user, but does not dynamically enforce limits or overflow excess into other accounts. Excess income beyond pension and ISA contributions is not tracked — the user manages their cash savings balance via the starting balance input.

### Drawdown Order (Post-Retirement)

User specifies the order in which accounts are drawn down in retirement across three categories:

1. **Cash** — Cash Savings drawn first, then Cash ISA (hardcoded internal order)
2. **ISA** — S&S ISA (withdrawals taken pro-rata from equities and bonds)
3. **SIPP** — 25% tax-free, 75% taxable per withdrawal

Default order: Cash → ISA → SIPP (defer pension tax as long as possible). The user can reorder these three categories.

When drawing from SIPP, withdrawals are grossed up to cover the tax due, so the user receives their full spending amount. The marginal tax rate is estimated at the start of each tax year based on known fixed income (e.g. state pension) and used for all SIPP drawdowns that year. Gross drawdown = spending need ÷ (1 − marginal rate × 0.75).

## Investment Allocation

Within SIPP and S&S ISA, balances are split between equities and bonds. The user specifies a single stock/bond allocation percentage that applies to both wrappers and remains fixed for the entire simulation. Growth is applied separately: the equity portion grows at the stock market growth rate, and the bond portion at the bond income rate. The target allocation is maintained each month (no drift, no explicit rebalancing transactions). Cash ISA and Cash Savings hold cash only and both earn the same cash interest rate.

All growth rates (equity, bond, cash, inflation) are nominal. The model computes real values by deflating nominal values by cumulative inflation.

During drawdown, withdrawals from SIPP and S&S ISA are taken pro-rata from the equity and bond portions.

## Tax Treatment

- Standard UK income tax bands on taxable income
- National Insurance (salary sacrifice pension contributions reduce employee NI liability)
- UK pension withdrawal rules: each SIPP drawdown is 25% tax-free and 75% taxable income
- Zero tax on ISA withdrawals
- Tax bands assume current rates and grow with inflation
- Tax computed monthly using 1/12 of annual tax bands
- Cash savings interest is not included in taxable income pre-retirement (MVP simplification)
- Pre-retirement tax is not computed at all. Since pre-retirement cash flow is not tracked, there is nothing for tax to feed into. Tax computation only applies post-retirement (SIPP drawdown grossing-up and income tax on pension withdrawals).

## Expenditure

- Annual spending target in today's money, grows with inflation
- Step-downs at specific ages: user specifies a new absolute spending amount from a given age (e.g. "from age 80, spend £25k/year"). Each entry replaces the previous spending level. Specified in today's money.
- One-off large expenses (amount in today's money + year). Pre-retirement: subtracted from cash savings, capped at zero (warn if cash savings is insufficient to cover the full amount). Post-retirement: funded through the normal drawdown order.

## Pension Rules

- State Pension age — default 68 (user can override in assumptions)
- Minimum pension access age — default 57 (user can override in assumptions)

## Retirement Transition

The simulation uses a clean break at the retirement age:
- Last salary payment and pension/ISA contributions occur in the month **before** the retirement month
- Spending drawdowns begin in the retirement month

## Assumptions & Parameters

User can override any of these default assumptions. All rates are nominal.

| Parameter | Default Value | Notes |
|-----------|--------------|-------|
|Inflation|2%| |
|Stock Market Growth|6%| |
|Cash interest rate|4%| |
|Bond income rate|4%| |
|Longevity|100 years| |
|Salary growth before retirement|3%| |
|State Pension amount|£11,500/year|Full new State Pension; user can adjust. Grows with inflation each year|
|Employer pension contribution|5% of salary| |
|State Pension age|68|User can override; actual age depends on birth year|
|Minimum pension access age|57|User can override|

 
## Modelling Approach

The model uses a month-by-month simulation, computing income and expenditure for each month and flowing balances through to the next.

The model supports two projection modes: deterministic (single simulation using fixed assumptions) and backtesting (multiple simulations using historical UK market/inflation data — see `07-backtesting.md`). The raw historical data files are described in `data/raw/README.md`.

