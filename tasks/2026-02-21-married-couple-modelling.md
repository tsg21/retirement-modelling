# Tasks: Married Couple Modelling

See PRD updates in `docs/prd/01-overview.md`, `02-user-model.md`, `03-financial-model.md`, `04-features.md`, and `05-ux-and-ui.md`.

## 19. Data model & validation for household mode
- [ ] Add `householdType` selector (`single` | `marriedCouple`) to input model
- [ ] Add partner-specific input structures (ages, retirement age, salary, balances, contribution settings)
- [ ] Add shared household inputs (spending target, one-off expenses, drawdown preferences)
- [ ] Add migration logic for localStorage (existing single-person payloads remain valid)
- [ ] Add validation rules for partner-level constraints (pension access age, retirement ordering sanity, non-negative values)

## 20. Engine changes for dual-person simulation
- [ ] Refactor simulation state to track Partner A and Partner B separately plus household totals
- [ ] Support partner-specific retirement transitions and salary/contribution stop dates
- [ ] Compute income tax and SIPP gross-up per partner (no pooled taxable income)
- [ ] Implement owner tie-break handling inside each drawdown wrapper category (A-first, B-first, proportional)
- [ ] Add deterministic integration tests for staggered retirement and different owner tie-break outcomes

## 21. Backtesting support for married-couple mode
- [ ] Ensure backtesting runner supports household mode without changing historical rate logic
- [ ] Add scenario-level assertions for partner-level tax and combined success rate outcomes
- [ ] Update percentile aggregation inputs to use combined household net worth while preserving partner drill-down data

## 22. UI updates for married-couple input and results
- [ ] Add household type toggle in the input panel
- [ ] Add Partner A / Partner B subsections for income, balances, and contributions
- [ ] Add partner-specific retirement age controls while retaining rapid what-if interactions
- [ ] Update summary cards to show household outcome plus partner breakdown chips
- [ ] Update chart tooltip/table rows to display combined totals with optional partner expansion

## 23. QA, documentation, and rollout
- [ ] Add unit tests for new validators and partner tax/drawdown logic
- [ ] Add end-to-end scenario tests covering single mode regression and married-couple happy path
- [ ] Run `npm test` and `npm run lint` from `app/` and resolve issues
- [ ] Document known limitations for married-couple mode in PRD overview and release notes
