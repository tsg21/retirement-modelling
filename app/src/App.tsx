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
          <button
            type="button"
            onClick={() => setShowHelpPage((currentValue) => !currentValue)}
            className="text-sm font-medium text-primary underline-offset-4 hover:underline"
          >
            {showHelpPage ? 'Back to planner' : 'Help'}
          </button>
        </div>
      </header>

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
