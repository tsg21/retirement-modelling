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

## Key User Scenarios

### "Am I saving enough?"

User is 40, earning £65k, saving 10% into SIPP with 5% employer match, plus £500/month into an ISA. They want to retire at 60. The model shows whether their pots will sustain their desired spending through to age 100, and what happens if they increase savings by 2%.

### "When can I retire?"

User is 52, has £300k in SIPP, £120k in ISA, £30k cash. They want to spend £35k/year in retirement. They vary the retirement age to find the earliest date that works across historical backtesting scenarios.

### "What if markets crash early in my retirement?"

User has just retired and wants to see how their plan holds up under different historical periods - including retiring into the 2000 dot-com crash or the 2008 financial crisis.

## User Inputs

### Personal Details
- Current age
- Target retirement age

### Income
- Current salary
- Expected salary growth (or use default assumption)

### Current Balances
- SIPP balance
- Stocks & Shares ISA balance
- Cash ISA balance
- Cash savings balance

### Contributions
- Employee pension contribution (% of salary)
- Employer pension contribution (% of salary)
- Monthly ISA contribution (£)
- Split between S&S ISA and Cash ISA

### Investment Allocation
- Stock/bond split (% in equities vs bonds) — applied to SIPP and S&S ISA

### Expenditure
- Annual spending target (today's money)
- Spending step-downs at specific ages (new absolute amount, e.g. "from age 80, spend £25k/year")
- One-off large expenses (amount and year — pre-retirement: funded from cash savings; post-retirement: funded through normal drawdown order)

### Drawdown Preferences
- Drawdown order across three categories: Cash (Cash Savings + Cash ISA), ISA (S&S ISA), SIPP
