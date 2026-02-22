# User Model & Scenarios

## User Personas

### Pre-Retiree Professional

- **Age range:** 35-55
- **Context:** Employed, accumulating savings across SIPP and ISA, wants to know if they're on track
- **Goals:** Understand when they can afford to retire; optimise savings rate and allocation
- **Pain points:** Existing calculators are too simplistic; can't model multiple account types or vary assumptions

### Near-Retiree

- **Age range:** 55-67
- **Context:** Approaching retirement, has built up pension and ISA pots, needs to plan drawdown
- **Goals:** Decide when to retire; understand drawdown order and tax implications; stress-test against bad market conditions
- **Pain points:** Uncertainty about whether savings will last; doesn't understand the impact of drawing pension vs ISA first

### Married Couple Household Planner

- **Age range:** 35-67 (at least one partner pre-retirement)
- **Context:** Two earners or one earner + one partially retired spouse, with mixed wrappers across both partners
- **Goals:** Coordinate retirement dates and drawdown strategy across both people while funding one shared lifestyle
- **Pain points:** Existing tools force separate plans and hide household tax trade-offs

## Key User Scenarios

### "Am I saving enough?"

User is 40, earning £65k, saving 10% into SIPP with 5% employer match, plus £500/month into an ISA. They want to retire at 60. The model shows whether their pots will sustain their desired spending through to age 100, and what happens if they increase savings by 2%.

### "When can I retire?"

User is 52, has £300k in SIPP, £120k in ISA, £30k cash. They want to spend £35k/year in retirement. They vary the retirement age to find the earliest date that works across historical backtesting scenarios.

### "What if markets crash early in my retirement?"

User has just retired and wants to see how their plan holds up under different historical periods - including retiring into the 2000 dot-com crash or the 2008 financial crisis.

### "Can we retire together or should one of us work longer?"

Household has Partner A (age 57) and Partner B (age 54), with different pension sizes and salaries. They compare retiring together versus a staggered retirement where one partner works three extra years.

## User Inputs

For married-couple mode, inputs are split into **Partner A**, **Partner B**, and **Household Shared** sections.

### Personal Details
- Current age
- Target retirement age

Married-couple mode:
- Partner A current age, target retirement age
- Partner B current age, target retirement age

### Income
- Current salary
- Expected salary growth (or use default assumption)

Married-couple mode:
- Salary and salary growth per partner

### Current Balances
- SIPP balance
- Stocks & Shares ISA balance
- Cash ISA balance
- Cash savings balance

Married-couple mode:
- Balances per partner for SIPP, S&S ISA, Cash ISA, Cash savings

### Contributions
- Employee pension contribution (% of salary)
- Employer pension contribution (% of salary)
- Monthly ISA contribution (£)
- Split between S&S ISA and Cash ISA

Married-couple mode:
- Contribution settings per partner

### Investment Allocation
- Stock/bond split (% in equities vs bonds) — applied to SIPP and S&S ISA

Married-couple mode:
- Allocation per partner (default both linked to same value, with optional unlink)

### Expenditure
- Annual spending target (today's money)
- Spending step-downs at specific ages (new absolute amount, e.g. "from age 80, spend £25k/year")
- One-off large expenses (amount, year, and optional short description — pre-retirement: funded from cash savings; post-retirement: funded through normal drawdown order). If a description is provided, the expense is shown as a labelled vertical line on the chart.

Married-couple mode:
- Shared household spending target and shared one-off expenses

### Drawdown Preferences
- Drawdown order across three categories: Cash (Cash Savings + Cash ISA), ISA (S&S ISA), SIPP

Married-couple mode:
- Household-level wrapper order (Cash, ISA, SIPP)
- Tie-breaker preference for ownership order within each wrapper category (Partner A first, Partner B first, or proportional)
