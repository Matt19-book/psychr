/**
 * useRBridge — React hook for running R analyses.
 *
 * Usage:
 *   const { run, isRunning, error } = useRBridge()
 *   const result = await run(rScript)
 *
 * On success, automatically appends the R script to the session script panel.
 */

import { useState, useCallback } from 'react'
import { usePsychrStore } from '../store'

interface UseRBridgeReturn {
  run: (script: string, label?: string) => Promise<Record<string, unknown> | null>
  isRunning: boolean
  error: string | null
  clearError: () => void
}

export function useRBridge(): UseRBridgeReturn {
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const appendToScript = usePsychrStore((s) => s.appendToScript)

  const run = useCallback(
    async (script: string, label?: string): Promise<Record<string, unknown> | null> => {
      setIsRunning(true)
      setError(null)

      try {
        // @ts-expect-error — window.psychr is injected by preload
        const result = await window.psychr.r.run(script)

        if (!result.success) {
          setError(result.error || 'Unknown R error')
          return null
        }

        // Append the clean R script (not the wrapped version) to session script
        const snippet = result.r_script || `# ${label || 'Analysis'}\n${script}`
        appendToScript(snippet)

        return result.data ?? result
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to run R')
        return null
      } finally {
        setIsRunning(false)
      }
    },
    [appendToScript]
  )

  const clearError = useCallback(() => setError(null), [])

  return { run, isRunning, error, clearError }
}
