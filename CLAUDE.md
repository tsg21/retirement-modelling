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
- `07-backtesting.md` - Backtesting feature design

## Simulation Engine

The simulation engine is in `app/src/engine/`. It is pure TypeScript with no React dependencies. See `app/src/engine/README.md` for module structure, responsibilities, and testing strategy.

## Key Design Decisions

- Month-by-month simulation engine (not annual)
- Two projection modes: deterministic (fixed assumptions) and backtesting (historical data)
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
- One-off expenses: pre-retirement cascade through cash savings → cash ISA → S&S ISA, post-retirement via normal drawdown order
- Spending step-downs: absolute amounts at specific ages (each replaces previous level)
- ISA and SIPP contribution limits: validate and warn, don't enforce dynamically
- State pension grows with inflation
- Historical backtesting data described in `data/raw/README.md`
- MVP simplifications and future enhancements documented in `docs/prd/01-overview.md`
- Out of scope (for now): DB pensions, property income, international income, annuities, GIA, joint modelling, children's education fees

## Accepted MVP Limitations

These were reviewed and accepted as reasonable trade-offs for the MVP:

- SIPP gross-up marginal rate can be significantly wrong when fixed income is below the personal allowance (e.g. before state pension starts, or when state pension < £12,570). The model will under-withdraw, making projections slightly optimistic.
- Post-retirement cash savings interest is not included in taxable income (same as pre-retirement).
- Pre-retirement one-off expenses that exceed cash savings + ISAs are capped at zero — the unfunded portion is silently lost (they cascade through Cash Savings → Cash ISA → S&S ISA).
- Tax bands grow with inflation (no way to model the current UK freeze separately from general inflation).
- Pension contributions are calculated on full gross salary (not qualifying earnings).
- "Today's money" means the year the simulation starts (the user's current age).

## App Structure

The app is in `app/` (Vite + React + TypeScript + Tailwind + shadcn/ui). Current state:
- **Mock UI is working** — two-panel layout, all input sections, summary bar, stacked area chart, data table, live updates on input change
- **Engine not yet implemented** — UI currently uses placeholder projection logic in `src/lib/mockData.ts`
- Implementation tasks are tracked in `tasks/` directory

## Working Pattern

When a new feature is to be added, it needs to be added to the PRD document first, along with a new task file in `tasks/`. This needs to be reviewed and approved before the implementation can begin.

### Task File Organization

- Task files live in `tasks/` directory
- Each task file is named with ISO-8601 date prefix: `YYYY-MM-DD-feature-name.md`
- Example: `tasks/2026-02-21-married-couple-modelling.md`
- This avoids merge conflicts and preserves history
- Completed tasks remain in the directory as a historical record

### Task Execution

Implementation follows the numbered steps in the current task file. Each step should be completed and its checkboxes marked `[x]` before moving to the next. When starting a new session:
1. Check `tasks/` directory for the most recent file (sort by date in filename)
2. Read that file to see where we left off
3. Begin the next unchecked step

**IMPORTANT: Always update task files when work is complete**
- Mark completed checkboxes as `[x]` in the task file
- Add section status markers (✅ for complete, ⏸️ for paused/deferred)
- Add notes explaining any deferred work or partial completion
- Do this proactively at the end of implementation, not just when asked
- This creates a clear progress record

## Testing

- Vitest configured in `app/vite.config.ts`, run with `npm test` from `app/`
- Test files live next to source: `src/engine/foo.test.ts` tests `src/engine/foo.ts`
- `npm run test:watch` for watch mode during development

## Code Quality

- ESLint is configured for the project. Run `npm run lint` from `app/` to check for issues.
- **IMPORTANT**: Always run the linter at the end of each implementation task (after tests pass). If any lint errors are found, fix them immediately before marking the task complete.
- Common fixes:
  - Remove unused imports
  - Add ESLint disable comments for intentional rule violations (e.g., `// eslint-disable-next-line rule-name`)
  - Fix type issues flagged by typescript-eslint
