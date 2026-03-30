/**
 * useDuckDB — Hook for querying large datasets via DuckDB.
 *
 * For files > 500MB (or when the user opts in), PsychR routes
 * data access through DuckDB rather than loading rows into memory.
 * This hook wraps the DuckDB R package via the R bridge.
 *
 * Usage:
 *   const { query, isQuerying, error } = useDuckDB()
 *   const rows = await query('SELECT * FROM df WHERE age > 25 LIMIT 100')
 */

import { useState, useCallback } from 'react'
import { useRBridge } from './useRBridge'
import { usePsychrStore } from '../store'

interface UseDuckDBReturn {
  query: (sql: string) => Promise<Record<string, unknown>[] | null>
  isQuerying: boolean
  error: string | null
}

export function useDuckDB(): UseDuckDBReturn {
  const [isQuerying, setIsQuerying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { run } = useRBridge()
  const activeDataset = usePsychrStore((s) => s.activeDataset)

  const query = useCallback(
    async (sql: string): Promise<Record<string, unknown>[] | null> => {
      if (!activeDataset?.isDuckDB && !activeDataset?.duckdbPath) {
        // Fall back to in-memory filtering for small datasets
        console.warn('useDuckDB: dataset is not in DuckDB mode')
        return null
      }

      setIsQuerying(true)
      setError(null)

      const path = activeDataset.duckdbPath || activeDataset.path || ''
      const escapedPath = path.replace(/\\/g, '\\\\')

      const rScript = `
library(duckdb)
library(jsonlite)

con <- dbConnect(duckdb())
tryCatch({
  # Register the dataset file (CSV or Parquet)
  if (grepl("\\\\.parquet$", "${escapedPath}", ignore.case = TRUE)) {
    dbExecute(con, "CREATE VIEW df AS SELECT * FROM read_parquet('${escapedPath}')")
  } else {
    dbExecute(con, "CREATE VIEW df AS SELECT * FROM read_csv_auto('${escapedPath}')")
  }

  result <- dbGetQuery(con, ${JSON.stringify(sql)})
  rows <- lapply(seq_len(nrow(result)), function(i) as.list(result[i, ]))

  cat(toJSON(list(success = TRUE, data = list(rows = rows, n = nrow(result))), auto_unbox = TRUE))
}, error = function(e) {
  cat(toJSON(list(success = FALSE, error = conditionMessage(e)), auto_unbox = TRUE))
}, finally = {
  dbDisconnect(con, shutdown = TRUE)
})
`

      try {
        const result = await run(rScript, `DuckDB: ${sql.slice(0, 40)}`)
        return (result?.rows as Record<string, unknown>[]) ?? null
      } catch (err) {
        setError(err instanceof Error ? err.message : 'DuckDB query failed')
        return null
      } finally {
        setIsQuerying(false)
      }
    },
    [activeDataset, run]
  )

  return { query, isQuerying, error }
}
