import { NumberField } from './NumberField'
import type { Inputs } from '../types'

interface AssumptionsSectionProps {
  inputs: Inputs
  backtestingMode: boolean
  onUpdateSingle: (key: string, value: number) => void
  onUpdateShared: <K extends keyof Inputs>(key: K, value: Inputs[K]) => void
}

export function AssumptionsSection({ inputs, backtestingMode, onUpdateSingle, onUpdateShared }: AssumptionsSectionProps) {
  return (
    <>
      {backtestingMode && (
        <div className="p-2 rounded bg-muted text-xs text-muted-foreground mb-2">
          Historical data is being used for inflation and growth rates. The fields below are used when historical data runs out.
        </div>
      )}
      {inputs.householdType === 'single' && (
        <>
          <NumberField
            label="State pension (annual)"
            value={inputs.statePensionOverride ?? inputs.statePensionAmount}
            onChange={v => onUpdateSingle('statePensionOverride', v)}
            prefix="£"
            step={100}
          />
          <NumberField
            label="State pension age"
            value={inputs.statePensionAge}
            onChange={v => onUpdateSingle('statePensionAge', v)}
            min={60}
            max={75}
          />
          <NumberField
            label="Minimum pension access age"
            value={inputs.minPensionAge}
            onChange={v => onUpdateSingle('minPensionAge', v)}
            min={55}
            max={60}
          />
        </>
      )}
      <NumberField
        label="Inflation"
        value={inputs.inflationPct}
        onChange={v => onUpdateShared('inflationPct', v)}
        suffix="%"
        step={0.5}
        disabled={backtestingMode}
      />
      <NumberField
        label="Equity growth"
        value={inputs.equityGrowthPct}
        onChange={v => onUpdateShared('equityGrowthPct', v)}
        suffix="%"
        step={0.5}
        disabled={backtestingMode}
      />
      <NumberField
        label="Bond income rate"
        value={inputs.bondRatePct}
        onChange={v => onUpdateShared('bondRatePct', v)}
        suffix="%"
        step={0.5}
        disabled={backtestingMode}
      />
      <NumberField
        label="Cash interest rate"
        value={inputs.cashRatePct}
        onChange={v => onUpdateShared('cashRatePct', v)}
        suffix="%"
        step={0.5}
        disabled={backtestingMode}
      />
      <NumberField
        label="Longevity (plan to age)"
        value={inputs.longevity}
        onChange={v => onUpdateShared('longevity', v)}
        min={70}
        max={110}
      />
    </>
  )
}
