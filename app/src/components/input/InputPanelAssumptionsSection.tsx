import { NumberField } from '@/components/NumberField'
import type { Inputs } from '@/types'

interface Props {
  inputs: Inputs
  backtestingMode: boolean
  updateSingle: (key: 'statePensionOverride' | 'statePensionAge' | 'minPensionAge', value: number | null) => void
  updateShared: <K extends keyof Inputs>(key: K, value: Inputs[K]) => void
}

export function InputPanelAssumptionsSection({ inputs, backtestingMode, updateSingle, updateShared }: Props) {
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
            onChange={v => updateSingle('statePensionOverride', v)}
            prefix="£"
            step={100}
          />
          <NumberField
            label="State pension age"
            value={inputs.statePensionAge}
            onChange={v => updateSingle('statePensionAge', v)}
            min={60}
            max={75}
          />
          <NumberField
            label="Minimum pension access age"
            value={inputs.minPensionAge}
            onChange={v => updateSingle('minPensionAge', v)}
            min={55}
            max={60}
          />
        </>
      )}
      <NumberField
        label="Inflation"
        value={inputs.inflationPct}
        onChange={v => updateShared('inflationPct', v)}
        suffix="%"
        step={0.5}
        disabled={backtestingMode}
      />
      <NumberField
        label="Equity growth"
        value={inputs.equityGrowthPct}
        onChange={v => updateShared('equityGrowthPct', v)}
        suffix="%"
        step={0.5}
        disabled={backtestingMode}
      />
      <NumberField
        label="Bond income rate"
        value={inputs.bondRatePct}
        onChange={v => updateShared('bondRatePct', v)}
        suffix="%"
        step={0.5}
        disabled={backtestingMode}
      />
      <NumberField
        label="Cash interest rate"
        value={inputs.cashRatePct}
        onChange={v => updateShared('cashRatePct', v)}
        suffix="%"
        step={0.5}
        disabled={backtestingMode}
      />
      <NumberField
        label="Longevity (plan to age)"
        value={inputs.longevity}
        onChange={v => updateShared('longevity', v)}
        min={70}
        max={110}
      />
    </>
  )
}
