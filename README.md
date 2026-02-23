# Retirement Modelling

A UK retirement planning financial modelling web app — and an experiment in AI-assisted software development.

## What is this?

This project has two purposes:

1. **A real tool**: Build a useful retirement planning calculator for UK residents, with month-by-month simulation, UK tax rules, pension rules, ISAs, and backtesting against historical data.

2. **An AI development experiment**: Explore how modern AI coding assistants can help build a non-trivial application. The workflow emphasizes structured planning (PRDs), task decomposition, and iterative implementation.

If you're interested in the financial modelling, see the [PRD documents](docs/prd/). If you're curious about the AI-assisted development approach, keep reading.

## Project Status

🚧 **In active development** — the UI is built and working with mock data. The simulation engine is being implemented step-by-step.

## AI-Assisted Development Approach

This project follows a structured workflow:

1. **PRD-first design**: Features are documented in [Product Requirements Documents](docs/prd/) before implementation
2. **Task decomposition**: Each feature gets a dated task file in [tasks/](tasks/) with numbered implementation steps
3. **Incremental implementation**: AI assistant implements tasks step-by-step, with tests and code quality checks
4. **Human oversight**: All PRDs and task plans are reviewed and approved before coding begins

See [CLAUDE.md](CLAUDE.md) for the full set of instructions given to the AI assistant.

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + shadcn/ui
- **Simulation Engine**: Pure TypeScript (no React dependencies)
- **Testing**: Vitest
- **Data**: Historical UK market returns and inflation (for backtesting)

## Project Structure

```
app/                    # React frontend application
  src/engine/          # Simulation engine (pure TypeScript)
  src/components/      # React UI components
  src/lib/             # Utilities and mock data
docs/prd/              # Product requirements documents
tasks/                 # Implementation task files (dated)
data/raw/              # Historical backtesting data
```

## Getting Started

```bash
cd app
npm install
npm run dev
```

The app will open at `http://localhost:5173`.

To run tests:
```bash
npm test
```

## Documentation

- [PRD Overview](docs/prd/01-overview.md) — Vision, goals, scope, MVP limitations
- [User Model](docs/prd/02-user-model.md) — Personas and input data
- [Financial Model](docs/prd/03-financial-model.md) — UK tax, pensions, modelling approach
- [Features](docs/prd/04-features.md) — Feature specs with acceptance criteria
- [UX & UI](docs/prd/05-ux-and-ui.md) — Design principles and key screens
- [Technical Architecture](docs/prd/06-technical.md) — Architecture and tech decisions
- [Backtesting](docs/prd/07-backtesting.md) — Historical data projection mode

## Contributing

This is a personal learning project, but if you're interested in the approach or want to suggest improvements, feel free to open an issue or PR.

## License

MIT
