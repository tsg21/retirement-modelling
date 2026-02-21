# Codex Startup Context

This repository keeps its primary project context in `CLAUDE.md`.

## Startup instruction
- On startup, read `CLAUDE.md` first for product context, architecture notes, accepted MVP limitations, workflow, and quality gates.
- Treat `CLAUDE.md` as the canonical context document unless a newer instruction in this file, system/developer message, or user message overrides it.

## Implementation workflow (from `CLAUDE.md`)
- For new features, update the PRD docs in `docs/prd/` and add a task in `tasks.md` before implementation.
- Execute implementation in numbered order from `tasks.md` and mark completed checkboxes as `[x]`.
- At the start of each session, check `tasks.md` and continue from the next unchecked step.

## Validation
- From `app/`, run tests with `npm test`.
- From `app/`, run lint with `npm run lint` after implementation and fix lint errors before completion.
