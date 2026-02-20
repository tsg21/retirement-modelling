import { useState, useCallback } from 'react'
import { DEFAULT_INPUTS, type Inputs } from '@/types'

const STORAGE_KEY = 'retirement-planner-inputs'

function loadInputs(): Inputs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_INPUTS
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return DEFAULT_INPUTS
    }
    return { ...DEFAULT_INPUTS, ...parsed }
  } catch {
    return DEFAULT_INPUTS
  }
}

function saveInputs(inputs: Inputs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs))
  } catch {
    // Silently fail (e.g. storage full, private browsing)
  }
}

export function usePersistedInputs(): [Inputs, (inputs: Inputs) => void] {
  const [inputs, setInputsState] = useState<Inputs>(loadInputs)

  const setInputs = useCallback((newInputs: Inputs) => {
    setInputsState(newInputs)
    saveInputs(newInputs)
  }, [])

  return [inputs, setInputs]
}
