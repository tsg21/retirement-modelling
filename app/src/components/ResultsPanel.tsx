import { useMemo, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { Inputs, YearProjection } from '../types'
import type { BacktestResult, SimulationWarning } from '../engine/types'
import { monthsToAnnual } from '../lib/mockData'
import { StackedAreaChart } from './charts/StackedAreaChart'
import { FanChart } from './charts/FanChart'
import { monthsToAnnualStartOfYear } from './charts/chartUtils'
import { SummaryBar } from './SummaryBar'
import { BacktestingSummary } from './BacktestingSummary'
import { DataTable } from './DataTable'
import { WarningBar } from './WarningBar'
import { ModeToggle } from './ModeToggle'
import { ScenarioSelector } from './ScenarioSelector'

interface ResultsPanelProps {
  data: YearProjection[]
  warnings: SimulationWarning[]
  inputs: Inputs
  backtestingMode: boolean
  onBacktestingModeChange: (enabled: boolean) => void
  backtestResult: BacktestResult | null
}

export function ResultsPanel({ data, warnings, inputs, backtestingMode, onBacktestingModeChange, backtestResult }: ResultsPanelProps) {
  const [selectedScenarioYear, setSelectedScenarioYear] = useState<number | null>(null)

  const selectedScenario = useMemo(
    () => backtestResult?.scenarios.find(s => s.startYear === selectedScenarioYear) ?? null,
    [backtestResult, selectedScenarioYear],
  )

  const scenarioOverlay = useMemo(
    () => {
      if (!selectedScenario) return []
      const currentAge = inputs.householdType === 'single' ? inputs.currentAge : inputs.partnerA.currentAge
      return monthsToAnnualStartOfYear(selectedScenario.result.months, currentAge)
    },
    [inputs, selectedScenario],
  )

  const tableData = selectedScenario ? monthsToAnnual(selectedScenario.result.months) : data

  return (
    <div>
      <ModeToggle backtestingMode={backtestingMode} onChange={onBacktestingModeChange} />
      <WarningBar warnings={warnings} />
      {backtestResult ? (
        <BacktestingSummary backtestResult={backtestResult} inputs={inputs} />
      ) : (
        <SummaryBar data={data} inputs={inputs} />
      )}

      <Tabs defaultValue="chart">
        <TabsList>
          <TabsTrigger value="chart">Chart</TabsTrigger>
          <TabsTrigger value="table">Table</TabsTrigger>
        </TabsList>

        <TabsContent value="chart" className="mt-4">
          {backtestResult ? (
            <>
              <FanChart
                percentileBands={backtestResult.percentileBands}
                inputs={inputs}
                overlay={scenarioOverlay}
              />
              <ScenarioSelector
                years={backtestResult.scenarios.map(s => s.startYear)}
                selectedYear={selectedScenario?.startYear ?? null}
                onSelect={setSelectedScenarioYear}
              />
            </>
          ) : (
            <StackedAreaChart data={data} inputs={inputs} />
          )}
        </TabsContent>

        <TabsContent value="table" className="mt-4">
          <DataTable data={tableData} inputs={inputs} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
