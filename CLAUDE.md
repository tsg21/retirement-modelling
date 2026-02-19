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

## Simulation Engine

The simulation engine is in `app/src/engine/`. It is pure TypeScript with no React dependencies. See `app/src/engine/README.md` for module structure, responsibilities, and testing strategy.

## Key Design Decisions

- Month-by-month simulation engine (not annual)
- MVP: deterministic projections only (fixed assumptions). Backtesting is a future enhancement.
- Interactive what-if exploration is a core feature
- Wrapper/account types tracked separately: SIPP, S&S ISA, Cash ISA, Cash Savings
- Within SIPP and S&S ISA, balances split between equities and bonds (single allocation %, maintained each month)
- All growth rates are nominal; values displayed in today's money (deflated by cumulative inflation)
- Pension contributions via salary sacrifice (employee NI saving only; employer NI saving not modelled)
- 25% pension tax-free applied per withdrawal (not as lump sum)
- Drawdown order: 3 categories (Cash, ISA, SIPP), not 4 wrappers. Cash = Cash Savings then Cash ISA (hardcoded). ISA = S&S ISA. Withdrawals from SIPP/S&S ISA taken pro-rata from equities and bonds.
- SIPP drawdowns grossed up to cover tax so user receives full spending amount. Marginal rate estimated at start of tax year from fixed income.
- Tax computed monthly using 1/12 of annual bands
- Cash savings interest not taxed pre-retirement (MVP simplification)
- One-off expenses: pre-retirement from cash savings, post-retirement via normal drawdown order
- Spending step-downs: absolute amounts at specific ages (each replaces previous level)
- ISA and SIPP contribution limits: validate and warn, don't enforce dynamically
- State pension grows with inflation
- Historical backtesting data described in `data/raw/README.md` (for future use)
- MVP simplifications and future enhancements documented in `docs/prd/01-overview.md`
- Out of scope (for now): DB pensions, property income, international income, annuities, GIA, joint modelling, children's education fees, backtesting
