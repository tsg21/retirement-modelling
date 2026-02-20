# UX & UI

## Design Principles

- **Instant feedback** — changing any input or assumption immediately updates the projection. No "run" button.
- **Progressive disclosure** — start with the essentials (age, salary, pension, target spend), let users drill into detail (tax-free lump sum strategy, drawdown order, one-off expenses) when they're ready.
- **Numbers and charts** — charts for intuition, tables for precision. Allow switching from one to the other.
- **Encourage exploration** — make it feel safe and fast to try different scenarios. Undo is always available. No commitment required.

## App Layout

Single-page app with two main areas:

- **Left panel (narrower):** inputs and assumptions — always visible, scrollable
- **Right panel (wider):** results — chart and summary, updates live as inputs change

This avoids a separate "input" and "results" step. The user sees the effect of every change immediately, which is the core value proposition.

On narrow screens, the panels stack vertically (inputs on top, results below), or the input panel collapses to a slide-out drawer.

## Input Panel

Organised into collapsible sections, with the most commonly changed fields at the top:

### Section 1: The Basics
- Current age
- Target retirement age ← **this is a key "what-if" lever, so give it a slider as well as a number input**
- Annual spending in retirement (today's money)

### Section 2: Income & Savings
- Current salary
- Employee pension contribution (%)
- Employer pension contribution (%)
- Monthly ISA contribution (£) with S&S / Cash split
- Salary growth assumption (%)

### Section 3: Current Balances
- SIPP, S&S ISA, Cash ISA, Cash Savings — simple number fields
- Stock/bond split (%) — single allocation applied to SIPP and S&S ISA

### Section 4: Advanced
Collapsed by default. Contains:
- Drawdown order (drag-to-reorder list of three categories: Cash, ISA, SIPP)
- Spending step-downs at specific ages (age + new annual amount in today's money, add/remove rows)
- One-off large expenses (amount + year, add/remove rows)
- State pension amount override

### Section 5: Assumptions
Collapsed by default. Shows the defaults from the financial model (inflation, growth rates, cash rate, state pension age, minimum pension access age, etc.) and lets the user override any of them.

### Reset Controls
- A "Reset to defaults" text button at the bottom of the input panel, styled as a subtle/secondary action (not prominent enough to hit accidentally)
- Triggers a confirmation dialog before resetting
- After reset, the panel scrolls to the top so the user sees the refreshed state

## Results Panel

### Summary Bar
A row of key headline numbers at the top of the results area:
- **Retirement age:** 60
- **Years of retirement funded:** 38 (or "to age 98")
- **Outcome:** "Money lasts to age 98" / "Shortfall from age 82" — with a clear green/amber/red signal
- **Total pot at retirement:** £X

These update live as inputs change.

### Primary Chart: Net Worth Over Time
- X-axis: age (or year). Vertical marker line at retirement age.
- Y-axis: total value in today's money
- Stacked area chart — one band per category (SIPP, ISA, Cash), so the user can see which pots deplete first. Cash = Cash Savings + Cash ISA; ISA = S&S ISA.

### Secondary View: Data Table
Below or in a tab alongside the chart:
- One row per year, showing the position at the start of each age year (i.e. the user's birthday). This aligns with the chart X-axis.
- Columns: Age, Salary, Contributions, Spending, SIPP Balance, ISA Balance, Cash Balance, Total Net Worth, Tax Paid (post-retirement only)
- Highlights the row where money runs out (if applicable)

## What-If Exploration

This is mostly handled by the "instant feedback" principle — every input change updates results live. A few additions to support deeper exploration:

- **Retirement age slider:** prominent slider in the basics section. Dragging it smoothly animates the chart, making it viscerally clear how each extra year of work helps.

## Visualisation Details

- All monetary values shown in **today's money** (inflation-adjusted)
- Chart tooltip on hover: shows age, year, and breakdown by account type
- Colour scheme: use a consistent, accessible palette across the three chart bands. Suggested: SIPP = blue, ISA = green, Cash = amber
- Retirement age shown as a vertical dashed line on all charts
- State pension start age shown as a second vertical marker

## Responsive / Mobile

- Web only, at least initially
- Desktop-first design (the two-panel layout is the primary experience)
- On screens < 768px: stack panels vertically, inputs collapse to a drawer accessible via a floating button
