# Tasks: Technical Debt Assessment Follow-ups

## 26. Break up oversized UI components
- [ ] Split `InputPanel.tsx` into smaller focused components/hooks and reduce mixed responsibilities.
- [ ] Split `ResultsPanel.tsx` into smaller focused components/hooks and reduce mixed responsibilities.

## 27. Remove duplicated input form code paths
- [ ] Consolidate duplicated `NumberField` patterns used across input components.
- [ ] Remove duplication between single-person input rendering and `PersonInputSection` field definitions.

## 28. Reduce duplicated drawdown logic
- [ ] Eliminate duplicated withdrawal and SIPP gross-up logic across single and couple drawdown modules.
- [ ] Reduce overlap between single and household drawdown orchestration paths.

## 29. Tighten type boundaries and migration safety
- [ ] Resolve typing friction between `MonthSnapshot` and couple-specific snapshots to avoid runtime shape checks/casts.
- [ ] Harden persisted input migration typing to reduce reliance on broad `as Inputs` assertions.

## 30. Align naming and architecture boundaries
- [ ] Rename or reorganize `mockData` projection utilities so naming matches current non-mock behavior.
- [ ] Reduce transformation/business-logic coupling currently housed in `ResultsPanel`.

## 31. Reduce simulation orchestrator complexity
- [ ] Decompose `simulate.ts` to reduce concentration of responsibilities and improve testability.
- [ ] Revisit single-mode normalization via virtual partner B to reduce hidden control-flow complexity.

## 32. Fix stale/outdated documentation
- [ ] Update `CLAUDE.md` project status statements that no longer match current engine implementation.
- [ ] Update root `README.md` status text to reflect the current implementation state.
- [ ] Replace `app/README.md` template content with project-relevant documentation.

## 33. Improve test suite signal quality
- [ ] Replace or upgrade low-signal scaffold tests (e.g. `engine.test.ts`) with meaningful behavioral coverage.
