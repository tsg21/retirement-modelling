import { useState, useMemo } from 'react'
import { InputPanel } from './components/InputPanel'
import { ResultsPanel } from './components/ResultsPanel'
import { generateProjection } from './lib/mockData'
import { DEFAULT_INPUTS } from './types'
import type { Inputs } from './types'

function App() {
  const [inputs, setInputs] = useState<Inputs>(DEFAULT_INPUTS)
  const data = useMemo(() => generateProjection(inputs), [inputs])

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="border-b border-border px-6 py-3">
        <h1 className="text-lg font-semibold">Retirement Planner</h1>
      </header>

      {/* Two-panel layout */}
      <div className="flex flex-col md:flex-row">
        {/* Input panel — narrow left */}
        <aside className="w-full md:w-80 lg:w-96 border-r border-border p-4 overflow-y-auto md:h-[calc(100vh-49px)]">
          <InputPanel inputs={inputs} onChange={setInputs} />
        </aside>

        {/* Results panel — wide right */}
        <main className="flex-1 p-6 overflow-y-auto md:h-[calc(100vh-49px)]">
          <ResultsPanel data={data} inputs={inputs} />
        </main>
      </div>
    </div>
  )
}

export default App
