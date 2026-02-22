import { useState, useCallback } from 'react'
import { DEFAULT_INPUTS, DEFAULT_COUPLE_INPUTS, type Inputs } from '@/types'

const STORAGE_KEY = 'retirement-planner-inputs'

function loadInputs(): Inputs {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_INPUTS
    const parsed = JSON.parse(raw)
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
      return DEFAULT_INPUTS
    }
    return migrateInputs(parsed)
  } catch {
    return DEFAULT_INPUTS
  }
}

function migrateInputs(parsed: unknown): Inputs {
  // Type guard: ensure parsed is an object
  if (typeof parsed !== 'object' || parsed === null) {
    return DEFAULT_INPUTS
  }

  const obj = parsed as Record<string, unknown>

  // If already has householdType, assume current schema
  if (obj.householdType === 'marriedCouple') {
    // Couple mode - merge with couple defaults
    return { ...DEFAULT_COUPLE_INPUTS, ...obj } as Inputs
  }

  // Otherwise treat as single mode (backward compat)
  // Old payloads without householdType are migrated to single mode
  return {
    ...DEFAULT_INPUTS,
    ...obj,
    householdType: 'single' as const,
  } as Inputs
}

function saveInputs(inputs: Inputs): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(inputs))
  } catch {
    // Silently fail (e.g. storage full, private browsing)
  }
}

export function usePersistedInputs(): [Inputs, (inputs: Inputs) => void, () => void] {
  const [inputs, setInputsState] = useState<Inputs>(loadInputs)

  const setInputs = useCallback((newInputs: Inputs) => {
    setInputsState(newInputs)
    saveInputs(newInputs)
  }, [])

  const resetInputs = useCallback(() => {
    setInputsState(DEFAULT_INPUTS)
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      // Silently fail
    }
  }, [])

  return [inputs, setInputs, resetInputs]
}
