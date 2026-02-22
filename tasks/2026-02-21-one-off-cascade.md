# Tasks: One-Off Expense Cascade

## 17. Pre-retirement one-off expense cascading
Update pre-retirement one-off expense handling to cascade through multiple account types (per updated PRD section 03-financial-model.md lines 75-77).

- [x] **Update spending module** — Modify pre-retirement one-off expense logic to draw from cash savings first, then cash ISA, then S&S ISA (pro-rata from equities/bonds). Track partial draws from each account type.
- [x] **Update warnings** — Change validation to warn if total available cash + ISAs cannot cover the expense (not just cash savings).
- [x] **Add tests** — Test scenarios: (1) expense fully covered by cash savings, (2) expense requires drawing from cash ISA, (3) expense requires drawing from S&S ISA, (4) expense exceeds all three sources (capped at zero shortfall).
- [x] **Integration test** — Run full simulation with a large pre-retirement one-off expense that cascades through all three account types. Verify balances deplete correctly and simulation continues.
