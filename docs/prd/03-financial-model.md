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

- **ISA** - annual contribution limit (currently £20k, shared across Cash ISA and S&S ISA). Contributions exceeding the limit overflow into cash savings.
- **SIPP** - annual allowance (currently £60k or 100% of earnings, whichever is lower). Employer contributions count towards this limit.

Limits assume current values and grow with inflation.

### Contributions (Pre-Retirement)

User specifies how their savings are allocated across wrappers:
- X% of salary into SIPP via salary sacrifice (with employer match if applicable). Salary sacrifice reduces gross salary, saving employee NI. (Employer NI savings are not modelled in MVP.)
- £Y per month into ISA (split between S&S ISA and Cash ISA as specified by user)

The model validates that stated contributions don't exceed ISA or SIPP annual limits and warns the user, but does not dynamically enforce limits or overflow excess into other accounts. Excess income beyond pension and ISA contributions is not tracked — the user manages their cash savings balance via the starting balance input.

### Drawdown Order (Post-Retirement)

User specifies the order in which accounts are drawn down in retirement. A sensible default could be: Cash savings first, then ISA, then SIPP (to defer pension tax), but the user should be able to change this.

## Investment Allocation

Within SIPP and S&S ISA, balances are split between equities and bonds. The user specifies a single stock/bond allocation percentage that applies to both wrappers. Growth is applied separately: the equity portion grows at the stock market growth rate, and the bond portion at the bond income rate. The target allocation is maintained each month (no drift, no explicit rebalancing transactions). Cash ISA and Cash Savings hold cash only and earn the cash interest rate.

All growth rates (equity, bond, cash, inflation) are nominal. The model computes real values by deflating nominal values by cumulative inflation.

During drawdown, withdrawals from SIPP and S&S ISA are taken pro-rata from the equity and bond portions.

## Tax Treatment

- Standard UK income tax bands on taxable income
- National Insurance (salary sacrifice pension contributions reduce employee NI liability)
- UK pension withdrawal rules: each SIPP drawdown is 25% tax-free and 75% taxable income
- Zero tax on ISA withdrawals
- Tax bands assume current rates and grow with inflation

## Expenditure

- Static value that grows with inflation
- Reduction at retirement is supported, and at specific ages.
- Support for one-offs for large purchases

## Pension Rules

- State Pension age - assume 68
- Minimum pension access age - assume 57
- 25% tax-free element applied per withdrawal (each drawdown is 25% tax-free)

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
|Savings rate|10%| |
|State Pension amount|£11,500/year|Full new State Pension; user can adjust. Grows with inflation each year|
|Employer pension contribution|5% of salary| |

 
## Modelling Approach

The model uses a month-by-month simulation, computing income and expenditure for each month and flowing balances through to the next.

The MVP uses deterministic projections only — a single simulation using fixed assumptions. Backtesting against historical data is a planned future enhancement (see `01-overview.md` MVP Simplifications table). The raw historical data files for future backtesting are described in `data/raw/README.md`.

