# Product Overview

## Vision

Help someone to decide what level of savings they need to achieve to hit their desired retirement date.

## Target Users
UK users who are planning their savings for retirement.

## Problem Statement

Free calculators don't support the functionality that is needed to make good decisions.

## Key Goals

1. Let users understand if they're on track for their target retirement date
1. Show the impact of changing savings rate, retirement age, or investment strategy
1. Provide realistic projections grounded in historical UK data

## Scope
### In Scope
- Capturing the current financial situation of the user.
- Modelling with specific assumptions about the future, i.e. investment returns, inflation.
- Allowing users to vary assumptions (e.g. growth rates, retirement age, savings rate, drawdown strategy) and immediately see the effect on projections. This interactive "what-if" exploration is a key feature of the app.
- Backtesting using historical stockmarket and inflation data.

### Out of Scope
For the time being, the following are not supported in the model.
- Defined benefit pensions
- Income from property
- International income
- Annuity purchase and returns
- General Investment Accounts (GIA)
- Joint/household modelling (single person only)
- Children's education fee modelling (approximate using one-off expenses instead)
- Backtesting against historical market data (MVP uses deterministic projections only)

## MVP Simplifications

The following simplifying assumptions apply to the MVP. They are documented here so they can be revisited in future iterations.

| Area | MVP Approach | Future Enhancement |
|------|-------------|-------------------|
| **Projection mode** | Deterministic only (fixed assumptions) | Add backtesting with historical UK market/inflation data |
| **Growth rates** | All rates (equity, bond, cash, inflation) are nominal. Real return = nominal − inflation | Could allow user to specify real or nominal |
| **Investment rebalancing** | Target stock/bond split is maintained each month (growth applied separately to each portion, no drift) | Model actual rebalancing with sells/buys |
| **Drawdown within wrappers** | Withdrawals from SIPP and S&S ISA taken pro-rata from equities and bonds | Allow user to specify drawdown allocation |
| **25% pension tax-free** | Applied per-withdrawal (each SIPP drawdown is 25% tax-free, 75% taxable) | Add option to take 25% as lump sum at retirement |
| **Employer NI savings** | Salary sacrifice reduces employee NI but employer NI savings are not modelled | Pass through employer NI savings to pension |
| **State pension growth** | Grows with inflation each year | Model triple lock (highest of inflation, earnings growth, 2.5%) |
| **Pre-retirement cash flow** | User specifies pension % and ISA amount; no automatic overflow of excess income to cash savings | Model full income → spending → savings flow |
| **ISA contribution limit** | Validate and warn if stated contributions exceed the limit; don't model mid-year overflow | Enforce dynamically with overflow to cash savings |
| **SIPP annual allowance** | Validate and warn; don't model carry-forward | Model carry-forward from previous 3 years |
| **Children / education fees** | Not modelled; use one-off expenses to approximate | Dedicated education fee modelling per child |
| **Tax computation** | Monthly using 1/12 of annual tax bands | Track cumulative annual income for exact band calculation |
| **Cash savings interest tax** | Interest on cash savings not taxed pre-retirement (second-order effect) | Include in pre-retirement income tax calculation |
| **Drawdown order** | Three categories: Cash (Cash Savings then Cash ISA), ISA (S&S ISA), SIPP | Allow independent ordering of all 4 wrappers |
| **SIPP drawdown tax** | Marginal rate estimated at start of tax year from fixed income; used to gross up all SIPP drawdowns that year | Iterative or exact solve for grossing-up within each month |
| **Nominal vs real toggle** | All values shown in today's money only | Add toggle to view in nominal terms |
