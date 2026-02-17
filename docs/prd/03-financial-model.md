# Financial Model

## Income Sources

- Salary from employment (prior to retirement)
- Interest income from savings
- Investment income from stocks
- Income from bonds
- State pension

## Account Types (Wrappers)

The model tracks assets across separate account types, each with different tax treatment:

- **SIPP (DC Pension)** - employer and employee contributions; tax relief on contributions; taxed as income on withdrawal (except 25% tax-free element)
- **Stocks & Shares ISA** - post-tax contributions; tax-free growth and withdrawals; subject to annual contribution limit
- **Cash ISA** - post-tax contributions; tax-free interest; subject to annual contribution limit (shared with S&S ISA)
- **Cash Savings** - post-tax; interest taxable as income
- **General Investment Account (GIA)** - post-tax contributions; growth subject to CGT on disposal

### Starting Balances

User provides current balance for each account type.

### Contribution Limits

- **ISA** - annual contribution limit (currently £20k, shared across Cash ISA and S&S ISA). Contributions exceeding the limit overflow into GIA or cash savings.
- **SIPP** - annual allowance (currently £60k or 100% of earnings, whichever is lower). Employer contributions count towards this limit.

Limits assume current values and grow with inflation.

### Contributions (Pre-Retirement)

User specifies how their savings are allocated across wrappers, e.g.:
- X% of salary into SIPP (with employer match if applicable)
- £Y per month into ISA (capped at annual limit)
- Remainder into cash savings

### Drawdown Order (Post-Retirement)

User specifies the order in which accounts are drawn down in retirement. A sensible default could be: Cash savings first, then ISA, then SIPP (to defer pension tax), but the user should be able to change this.

## Tax Treatment

- Standard UK income tax bands on taxable income
- National Insurance
- UK pension withdrawl rules including 25% tax free element
- Zero tax on ISA withdrawals
- Tax bands assume current rates and grow with inflation

## Expenditure

- Static value that grows with inflation
- Reduction at retirement is supported, and at specific ages.
- Support for one-offs for large purchases
- Private school and univesity fees for children.

## Pension Rules

- State Pension age - assume 68
- Minimum pension access age - assume 57
- Option to handle 25% tax free amount either as lump sum or spread over drawdowns (to see the effect)

## Assumptions & Parameters

User can specify the assumptions that they want to make. In some cases these are overriden in the backtesting case.

| Parameter | Default Value | Notes |
|-----------|--------------|-------|
|Inflation|2%|Overridden for backtesting|
|Stock Market Growth|6%|Overridden for backtesting|
|Cash interest rate|4%| |
|Bond income rate|4%| |
|Longevity|100 years| |
|Salary growth before retirement|3%| |
|Savings rate|10%| |
|State Pension amount|£11,500/year|Full new State Pension; user can adjust based on qualifying years|
|Employer pension contribution|5% of salary| |

 
## Modelling Approach

The model uses a month-by-month approach, computing the income and expenditure for that month, and then flowing balances through to the next month.

For the backtesting, multiple scenarios are run to show the effect of a range of historical scenarios. A "scenario" is a simultion of what would have happened had I retired in year X, and experienced the real stock market and inflation effects of the following Y years.

For the fixed assumptions, the modelling produces a deterministic result.

