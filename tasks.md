# Tasks: Mock UI

## Setup
- [ ] Scaffold Vite + React + TypeScript project
- [ ] Add basic CSS reset and layout styles

## Layout
- [ ] Two-panel layout: narrow left (inputs), wide right (results)
- [ ] Responsive: stack vertically on narrow screens

## Input Panel
- [ ] Section 1 — The Basics: age, retirement age (with slider), annual spending
- [ ] Section 2 — Income & Savings: salary, pension contributions, ISA contributions, salary growth
- [ ] Section 3 — Current Balances: SIPP, S&S ISA, Cash ISA, Cash Savings, stock/bond split
- [ ] Section 4 — Advanced (collapsed): drawdown order, spending step-downs, one-off expenses, state pension override
- [ ] Section 5 — Assumptions (collapsed): inflation, growth rates, cash rate, state pension age, min pension age
- [ ] Collapsible section behaviour

## Results Panel
- [ ] Summary bar: retirement age, years funded, outcome indicator, total pot at retirement
- [ ] Chart placeholder: stacked area chart with mock data (age on X, net worth on Y, bands for SIPP/ISA/Cash)
- [ ] Data table: annual rows with columns per spec, toggle between chart and table views

## Interactivity
- [ ] Wire inputs to React state so changes propagate to results panel
- [ ] Generate mock projection data from inputs (simple formula, not real engine)
- [ ] Retirement age slider updates chart/summary live
