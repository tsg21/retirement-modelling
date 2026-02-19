# Features & Requirements

## Core Features

### F1: User Input Capture

Capture the user's current financial situation and preferences via the input panel. See `02-user-model.md` for the full input list and `05-ux-and-ui.md` for panel layout.

- All inputs persist in browser local storage between sessions
- Sensible defaults pre-populated for assumptions and optional fields
- Validation: prevent clearly invalid inputs (e.g. negative ages, retirement before current age). Warn if contributions exceed ISA or SIPP annual limits

### F2: Deterministic Projection

Single projection using fixed assumptions (inflation, growth rates, cash rate, etc.).

- Month-by-month simulation from current age to longevity age
- Tracks balances separately per account type, applying correct tax treatment to each
- Applies UK income tax bands and NI to salary and pension withdrawals
- Draws down accounts in user-specified order post-retirement (three categories: Cash, ISA, SIPP)
- Grosses up SIPP withdrawals to cover tax, so user receives their full spending amount
- Handles 25% pension tax-free element (applied per withdrawal)
- Adds State Pension income from State Pension age (growing with inflation)

### F3: Results Display

Present projection results as summary, chart, and table. See `05-ux-and-ui.md` Results Panel for layout and detail.

- All values shown in today's money (inflation-adjusted)
- Toggle between chart and table views

### F4: What-If Exploration

Enable fast, interactive exploration of different scenarios.

- All input changes reflect immediately in results (instant feedback)
- Retirement age slider for quick exploration of the impact of retiring earlier/later
- Assumptions section allows overriding any default parameter

## Future Features (Backlog)

See also the MVP Simplifications table in `01-overview.md` for features deferred from the MVP with specific enhancement notes.

- Backtesting with historical UK market/inflation data — full design in `07-backtesting.md`
- Children's education fee modelling (annual cost per child, start/end ages)
- 25% tax-free lump sum option (take entire 25% at retirement vs per-withdrawal)
- Nominal values toggle (view projections in nominal terms as well as today's money)
- Comparison snapshots: pin a scenario and compare it visually against the current projection
- Reverse solve ("what do I need?"): specify a target outcome and solve for required savings rate or retirement age
- Export results to PDF or CSV
- Joint/household modelling (two people, shared expenses)
- General Investment Account (GIA) support
- Defined benefit pensions
- Property income
- Annuity modelling

## Non-Functional Requirements

- **Performance:** projection recalculates within 200ms of an input change.
- **Privacy:** all data stays in the browser. No server calls, no analytics, no cookies beyond local storage.
- **Accessibility:** meets WCAG 2.1 AA. All interactive elements keyboard-navigable. Chart data also available as a table.
- **Browser support:** latest versions of Chrome, Firefox, Safari, Edge.
- **Data integrity:** local storage data survives browser refresh. Graceful handling of corrupted or missing stored data.
