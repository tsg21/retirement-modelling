# Retirement Modelling App

Frontend application for the UK retirement planning model.

## Stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn/ui
- Vitest for unit tests
- ESLint for linting

## Scripts

Run all commands from `app/`:

- `npm run dev` — start local development server
- `npm run build` — type-check and build production bundle
- `npm run preview` — preview production build locally
- `npm test` — run test suite once
- `npm run test:watch` — run tests in watch mode
- `npm run lint` — run ESLint checks
- `npm run data:process` — process historical raw datasets into app-ready assets

## Architecture Notes

- The simulation engine lives in `src/engine/` and is pure TypeScript (no React dependencies).
- `src/lib/mockData.ts` is a legacy filename that now acts as the adapter between UI components and the engine output.
- UI components live in `src/components/`.

## Related Documentation

- Root project context: `../CLAUDE.md`
- Product requirements: `../docs/prd/`
- Implementation task tracking: `../tasks/`
