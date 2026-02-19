# Retirement Modelling

UK retirement planning financial modelling web app.

## PRD Documents

The product requirements are in `docs/prd/`:

- `01-overview.md` - Vision, target users, problem statement, goals, scope
- `02-user-model.md` - Personas, user scenarios, input data
- `03-financial-model.md` - Income sources, UK tax rules, pension rules, assumptions, modelling approach
- `04-features.md` - Feature specs with acceptance criteria, non-functional requirements
- `05-ux-and-ui.md` - Design principles, key screens, visualisations
- `06-technical.md` - Architecture, tech stack, deployment, privacy
- `07-backtesting.md` - Backtesting feature design (post-MVP)

## Key Design Decisions

- Month-by-month simulation engine (not annual)
- MVP: deterministic projections only (fixed assumptions). Backtesting is a future enhancement.
- Interactive what-if exploration is a core feature
- Wrapper/account types tracked separately: SIPP, S&S ISA, Cash ISA, Cash Savings
- Within SIPP and S&S ISA, balances split between equities and bonds (single allocation %, maintained each month)
- All growth rates are nominal; values displayed in today's money (deflated by cumulative inflation)
- Pension contributions via salary sacrifice (employee NI saving only; employer NI saving not modelled)
- 25% pension tax-free applied per withdrawal (not as lump sum)
- User specifies drawdown order across wrappers; withdrawals from SIPP/S&S ISA taken pro-rata from equities and bonds
- ISA and SIPP contribution limits: validate and warn, don't enforce dynamically
- State pension grows with inflation
- Historical backtesting data described in `data/raw/README.md` (for future use)
- MVP simplifications and future enhancements documented in `docs/prd/01-overview.md`
- Out of scope (for now): DB pensions, property income, international income, annuities, GIA, joint modelling, children's education fees, backtesting
