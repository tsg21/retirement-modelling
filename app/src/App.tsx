import { useMemo, useRef, useState } from 'react'
import { InputPanel } from './components/InputPanel'
import { ResultsPanel } from './components/ResultsPanel'
import { HelpPage } from './components/HelpPage'
import { generateProjection } from './lib/mockData'
import { usePersistedInputs } from './hooks/usePersistedInputs'
import { runBacktest } from './engine/backtesting'
import historicalData from './data/historicalReturns.json'
import type { HistoricalMonth } from './data/scenarioBuilder'

function App() {
  const [inputs, setInputs, resetInputs] = usePersistedInputs()
  const [backtestingMode, setBacktestingMode] = useState(false)
  const [showHelpPage, setShowHelpPage] = useState(false)
  const [showAbout, setShowAbout] = useState(false)
  const asideRef = useRef<HTMLElement>(null)
  const { data, warnings } = useMemo(() => generateProjection(inputs), [inputs])
  const backtestResult = useMemo(
    () => backtestingMode ? runBacktest(inputs, historicalData as HistoricalMonth[]) : null,
    [backtestingMode, inputs],
  )

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-6 py-3">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-lg font-semibold">Retirement Planner</h1>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowHelpPage((currentValue) => !currentValue)}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground shadow-sm transition-opacity hover:opacity-90"
            >
              {showHelpPage ? 'Back to planner' : 'Help'}
            </button>
            <button
              type="button"
              onClick={() => setShowAbout(true)}
              className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
            >
              About
            </button>
          </div>
        </div>
      </header>

      {showAbout ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="about-title"
        >
          <div className="w-full max-w-xl rounded-lg border border-border bg-background p-6 shadow-xl">
            <h2 id="about-title" className="text-lg font-semibold">About this tool</h2>
            <p className="mt-3 text-sm text-muted-foreground">
              This project is both a practical retirement modelling tool and an exercise in AI-assisted
              software development. It is designed to explore financial scenarios and to demonstrate
              a structured approach to building software with AI.
            </p>
            <p className="mt-3 text-sm text-muted-foreground">
              GitHub repository:{' '}
              <a
                href="https://github.com/tsg21/retirement-modelling"
                target="_blank"
                rel="noreferrer"
                className="font-medium text-primary underline-offset-4 hover:underline"
              >
                https://github.com/tsg21/retirement-modelling
              </a>
            </p>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setShowAbout(false)}
                className="rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {showHelpPage ? (
        <HelpPage />
      ) : (
        <div className="flex flex-col md:flex-row">
          {/* Input panel — narrow left */}
          <aside ref={asideRef} className="w-full md:w-80 lg:w-96 border-r border-border p-4 overflow-y-auto md:h-[calc(100vh-49px)]">
            <InputPanel
              inputs={inputs}
              onChange={setInputs}
              onReset={() => {
                resetInputs()
                asideRef.current?.scrollTo({ top: 0, behavior: 'smooth' })
              }}
              backtestingMode={backtestingMode}
            />
          </aside>

          {/* Results panel — wide right */}
          <main className="flex-1 p-6 overflow-y-auto md:h-[calc(100vh-49px)]">
            <ResultsPanel
              data={data}
              warnings={warnings}
              inputs={inputs}
              backtestingMode={backtestingMode}
              onBacktestingModeChange={setBacktestingMode}
              backtestResult={backtestResult}
            />
          </main>
        </div>
      )}
    </div>
  )
}

export default App
