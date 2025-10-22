'use client'

import { useEffect, useState } from 'react'

const MANUAL_MODE_KEY = 'quest-manual-mode-unlocked'

/**
 * Hook for managing manual mode unlock state
 * By default, Quest/Milestone/Checkpoint creation is locked,
 * requiring users to use the AI Assistant.
 * Users can manually unlock this mode if they prefer.
 */
export function useManualMode() {
  const [isUnlocked, setIsUnlocked] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Load unlock state from localStorage
    const stored = localStorage.getItem(MANUAL_MODE_KEY)
    setIsUnlocked(stored === 'true')
    setIsLoading(false)
  }, [])

  const unlock = () => {
    setIsUnlocked(true)
    localStorage.setItem(MANUAL_MODE_KEY, 'true')
  }

  const lock = () => {
    setIsUnlocked(false)
    localStorage.setItem(MANUAL_MODE_KEY, 'false')
  }

  const toggle = () => {
    if (isUnlocked) {
      lock()
    } else {
      unlock()
    }
  }

  return {
    isUnlocked,
    isLoading,
    unlock,
    lock,
    toggle
  }
}
