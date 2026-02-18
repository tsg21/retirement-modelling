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

## Key Design Decisions

- Month-by-month simulation engine (not annual)
- Two modes: deterministic (fixed assumptions) and backtesting (historical data)
- Backtesting = rolling historical windows ("what if I retired in year X")
- Interactive what-if exploration is a core feature
- Wrapper/account types tracked separately: SIPP, S&S ISA, Cash ISA, Cash Savings, GIA
- User specifies drawdown order across wrappers
- ISA and SIPP contribution limits enforced, growing with inflation
- Out of scope (for now): DB pensions, property income, international income, annuities
