import type { Inputs, PersonInputs } from '@/types'
import { DEFAULT_COUPLE_INPUTS, DEFAULT_INPUTS } from '@/types'

export function useInputPanelHandlers(inputs: Inputs, onChange: (inputs: Inputs) => void) {
  const handleHouseholdTypeChange = (newType: 'single' | 'marriedCouple') => {
    if (newType === inputs.householdType) return

    if (newType === 'marriedCouple') {
      if (inputs.householdType === 'single') {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { householdType: _, ...personAndShared } = inputs
        const {
          currentAge,
          retirementAge,
          salary,
          employeePensionPct,
          employerPensionPct,
          monthlyISA,
          ssISASplitPct,
          salaryGrowthPct,
          sippBalance,
          ssISABalance,
          cashISABalance,
          cashSavingsBalance,
          stockBondSplitPct,
          statePensionAge,
          minPensionAge,
          statePensionAmount,
          statePensionOverride,
          ...shared
        } = personAndShared

        onChange({
          ...shared,
          householdType: 'marriedCouple',
          partnerA: {
            currentAge,
            retirementAge,
            salary,
            employeePensionPct,
            employerPensionPct,
            monthlyISA,
            ssISASplitPct,
            salaryGrowthPct,
            sippBalance,
            ssISABalance,
            cashISABalance,
            cashSavingsBalance,
            stockBondSplitPct,
            statePensionAge,
            minPensionAge,
            statePensionAmount,
            statePensionOverride,
          },
          partnerB: DEFAULT_COUPLE_INPUTS.partnerB,
          ownerTieBreak: 'proportional',
        })
      }

      return
    }

    if (inputs.householdType === 'marriedCouple') {
      onChange({
        ...inputs,
        ...inputs.partnerA,
        householdType: 'single',
      } as Inputs)
    }
  }

  const updateSingle = <K extends keyof PersonInputs | keyof typeof DEFAULT_INPUTS>(
    key: K,
    value: typeof DEFAULT_INPUTS[K & keyof typeof DEFAULT_INPUTS],
  ) => {
    if (inputs.householdType === 'single') {
      onChange({ ...inputs, [key]: value })
    }
  }

  const updatePartnerA = <K extends keyof PersonInputs>(key: K, value: PersonInputs[K]) => {
    if (inputs.householdType === 'marriedCouple') {
      onChange({
        ...inputs,
        partnerA: { ...inputs.partnerA, [key]: value },
      })
    }
  }

  const updatePartnerB = <K extends keyof PersonInputs>(key: K, value: PersonInputs[K]) => {
    if (inputs.householdType === 'marriedCouple') {
      onChange({
        ...inputs,
        partnerB: { ...inputs.partnerB, [key]: value },
      })
    }
  }

  const updateShared = <K extends keyof Inputs>(key: K, value: Inputs[K]) => {
    onChange({ ...inputs, [key]: value })
  }

  return {
    handleHouseholdTypeChange,
    updateSingle,
    updatePartnerA,
    updatePartnerB,
    updateShared,
  }
}
