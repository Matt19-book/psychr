/**
 * Tab 1: Data Cleaning
 *
 * Workspace for importing, inspecting, and wrangling datasets.
 * Left panel: variable list + type editor
 * Center: AG Grid spreadsheet
 * Right: R script preview
 */

import { useCallback, useRef, useState } from 'react'
import { WorkspaceLayout, PanelHeader } from '../../components/layout/WorkspaceLayout'
import { usePsychrStore, Dataset, DataColumn } from '../../store'
import { ScriptPanel } from '../../components/shared/ScriptPanel'

// Sample dataset for demo when no file is loaded
const SAMPLE_DATA = [
  { id: 1, age: 24, gender: 'Female', anxiety: 42, depression: 31, gpa: 3.7 },
  { id: 2, age: 19, gender: 'Male',   anxiety: 55, depression: 44, gpa: 2.9 },
  { id: 3, age: 22, gender: 'Female', anxiety: 38, depression: 28, gpa: 3.4 },
  { id: 4, age: 25, gender: 'Male',   anxiety: 61, depression: 52, gpa: 2.6 },
  { id: 5, age: 21, gender: 'Female', anxiety: 47, depression: 36, gpa: 3.1 },
  { id: 6, age: 23, gender: 'Non-binary', anxiety: 50, depression: 39, gpa: 3.5 },
  { id: 7, age: 20, gender: 'Male',   anxiety: 58, depression: 49, gpa: 3.0 },
  { id: 8, age: 26, gender: 'Female', anxiety: 35, depression: 25, gpa: 3.8 },
]

const SAMPLE_COLUMNS: DataColumn[] = [
  { name: 'id', type: 'numeric', missingCount: 0, uniqueCount: 8 },
  { name: 'age', type: 'numeric', missingCount: 0, uniqueCount: 7, min: 19, max: 26, mean: 22.5 },
  { name: 'gender', type: 'factor', missingCount: 0, uniqueCount: 3 },
  { name: 'anxiety', type: 'numeric', missingCount: 0, uniqueCount: 8, min: 35, max: 61, mean: 48.5 },
  { name: 'depression', type: 'numeric', missingCount: 0, uniqueCount: 8, min: 25, max: 52, mean: 37.9 },
  { name: 'gpa', type: 'numeric', missingCount: 0, uniqueCount: 8, min: 2.6, max: 3.8, mean: 3.25 },
]

const TYPE_COLORS: Record<string, string> = {
  numeric: 'bg-blue-100 text-blue-700',
  factor: 'bg-purple-100 text-purple-700',
  character: 'bg-green-100 text-green-700',
  date: 'bg-orange-100 text-orange-700',
  logical: 'bg-gray-100 text-gray-700',
}

export function DataCleaningTab() {
  const addDataset = usePsychrStore((s) => s.addDataset)
  const datasets = usePsychrStore((s) => s.datasets)
  const activeDataset = usePsychrStore((s) => s.activeDataset)
  const setActiveDataset = usePsychrStore((s) => s.setActiveDataset)
  const appendToScript = usePsychrStore((s) => s.appendToScript)

  const [isLoading, setIsLoading] = useState(false)
  const [filterText, setFilterText] = useState('')
  const [selectedCol, setSelectedCol] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Use sample data if no dataset loaded
  const displayData = activeDataset?.data ?? SAMPLE_DATA
  const displayColumns = activeDataset?.columns ?? SAMPLE_COLUMNS
  const isDemo = !activeDataset

  const handleImportFile = useCallback(async () => {
    setIsLoading(true)
    try {
      let filePaths: string[] = []

      // Try Electron file dialog first, fall back to browser input
      if (typeof window !== 'undefined' && (window as any).psychr) {
        const result = await (window as any).psychr.dialog.openFile()
        if (result.canceled) return
        filePaths = result.filePaths
      } else {
        // Browser fallback: use file input
        fileInputRef.current?.click()
        return
      }

      if (filePaths.length === 0) return
      const path = filePaths[0]
      const name = path.split(/[\\/]/).pop() || 'dataset'

      // Use R to read the file (supports CSV, XLSX, SAV, RDS, TSV)
      const ext = name.split('.').pop()?.toLowerCase()
      const safePath = path.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
      const readCmd = ext === 'csv' || ext === 'tsv'
        ? `df <- read.csv("${safePath}")`
        : ext === 'xlsx' || ext === 'xls'
        ? `library(readxl)\ndf <- as.data.frame(read_excel("${safePath}"))`
        : ext === 'sav'
        ? `library(haven)\ndf <- as.data.frame(read_sav("${safePath}"))`
        : ext === 'rds'
        ? `df <- readRDS("${safePath}")`
        : `df <- read.csv("${safePath}")`

      // Call R to read the file and inspect its structure
      const inspectScript = `
library(jsonlite)
${readCmd}

n_rows <- nrow(df)
n_cols <- ncol(df)

col_info <- lapply(names(df), function(col_name) {
  col <- df[[col_name]]
  col_class <- class(col)[1]
  col_type <- if (is.numeric(col)) "numeric"
              else if (is.factor(col)) "factor"
              else if (is.logical(col)) "logical"
              else if (inherits(col, "Date") || inherits(col, "POSIXct")) "date"
              else "character"

  result <- list(
    name = col_name,
    type = col_type,
    missingCount = sum(is.na(col)),
    uniqueCount = length(unique(col[!is.na(col)]))
  )
  if (col_type == "numeric") {
    result$min <- round(min(col, na.rm = TRUE), 4)
    result$max <- round(max(col, na.rm = TRUE), 4)
    result$mean <- round(mean(col, na.rm = TRUE), 4)
    result$sd <- round(sd(col, na.rm = TRUE), 4)
  }
  result
})

# First 200 rows as JSON
preview_rows <- head(df, 200)
preview_list <- lapply(seq_len(nrow(preview_rows)), function(i) {
  row <- as.list(preview_rows[i, ])
  lapply(row, function(v) if (is.na(v)) NULL else v)
})

cat(toJSON(list(
  success = TRUE,
  r_script = paste0("# Import data\\n${readCmd.replace(/\n/g, '\\n')}\\n"),
  data = list(
    rows = n_rows,
    columns = col_info,
    preview = preview_list
  )
), auto_unbox = TRUE, null = "null"))
`

      // Run the R script
      const rResult = await (window as any).psychr?.r?.run(inspectScript)

      if (!rResult?.success) {
        alert(`Failed to import file: ${rResult?.error || 'Unknown error'}`)
        return
      }

      const rData = rResult.data ?? rResult
      const dataset: Dataset = {
        id: `dataset_${Date.now()}`,
        name,
        path,
        rows: rData.rows as number ?? 0,
        columns: (rData.columns as DataColumn[]) ?? [],
        data: (rData.preview as Record<string, unknown>[]) ?? [],
        isDuckDB: false,
        importedAt: new Date(),
      }

      addDataset(dataset)
      appendToScript(`# Import dataset\n${readCmd}\n`)
    } finally {
      setIsLoading(false)
    }
  }, [addDataset, appendToScript])

  const filteredData = filterText
    ? displayData.filter((row) =>
        Object.values(row).some((v) =>
          String(v).toLowerCase().includes(filterText.toLowerCase())
        )
      )
    : displayData

  const selectedColInfo = displayColumns.find((c) => c.name === selectedCol)

  return (
    <WorkspaceLayout
      leftWidth="260px"
      left={
        <div className="flex flex-col h-full">
          <PanelHeader title="Variables" subtitle={`${displayColumns.length} columns`} />
          <div className="flex-1 overflow-y-auto">
            {displayColumns.map((col) => (
              <button
                key={col.name}
                onClick={() => setSelectedCol(col.name === selectedCol ? null : col.name)}
                className={`
                  w-full text-left px-3 py-2.5 border-b border-gray-100
                  flex items-center gap-2 hover:bg-gray-50 transition-colors
                  ${selectedCol === col.name ? 'bg-psychr-accent' : ''}
                `}
              >
                <span
                  className={`text-xs px-1.5 py-0.5 rounded font-mono font-medium ${TYPE_COLORS[col.type]}`}
                >
                  {col.type.slice(0, 3)}
                </span>
                <span className="text-sm font-medium text-gray-800 truncate">{col.name}</span>
                {col.missingCount > 0 && (
                  <span className="ml-auto text-xs text-orange-500">{col.missingCount}NA</span>
                )}
              </button>
            ))}
          </div>

          {/* Column details panel */}
          {selectedColInfo && (
            <div className="border-t border-gray-200 p-3 bg-white">
              <p className="text-xs font-semibold text-gray-700 mb-1">{selectedColInfo.name}</p>
              <div className="space-y-0.5 text-xs text-gray-600">
                <div className="flex justify-between">
                  <span>Type</span>
                  <span className="font-medium">{selectedColInfo.type}</span>
                </div>
                <div className="flex justify-between">
                  <span>Missing</span>
                  <span className="font-medium">{selectedColInfo.missingCount}</span>
                </div>
                <div className="flex justify-between">
                  <span>Unique</span>
                  <span className="font-medium">{selectedColInfo.uniqueCount}</span>
                </div>
                {selectedColInfo.mean !== undefined && (
                  <div className="flex justify-between">
                    <span>Mean</span>
                    <span className="font-medium">{selectedColInfo.mean?.toFixed(2)}</span>
                  </div>
                )}
                {selectedColInfo.min !== undefined && (
                  <div className="flex justify-between">
                    <span>Range</span>
                    <span className="font-medium">{selectedColInfo.min} – {selectedColInfo.max}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Import button */}
          <div className="p-3 border-t border-gray-200">
            <button
              onClick={handleImportFile}
              disabled={isLoading}
              className="w-full bg-psychr-midblue text-white text-sm font-medium py-2 px-3 rounded hover:bg-psychr-blue transition-colors disabled:opacity-50"
            >
              {isLoading ? 'Importing...' : '+ Import Dataset'}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".csv,.xlsx,.xls,.sav,.rds,.tsv"
            />
          </div>
        </div>
      }
      center={
        <div className="flex flex-col h-full">
          {/* Toolbar */}
          <div className="flex items-center gap-2 px-4 py-2 bg-white border-b border-gray-200">
            {isDemo && (
              <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                Demo data — import a file to get started
              </span>
            )}
            <input
              value={filterText}
              onChange={(e) => setFilterText(e.target.value)}
              placeholder="Filter rows..."
              className="ml-auto text-sm border border-gray-300 rounded px-2 py-1 w-48 focus:outline-none focus:ring-1 focus:ring-psychr-midblue"
            />
            <span className="text-xs text-gray-500">
              {filteredData.length.toLocaleString()} rows
            </span>
          </div>

          {/* Data grid (simple HTML table for Phase 1 — AG Grid added in Phase 2) */}
          <div className="flex-1 overflow-auto">
            <table className="min-w-full text-sm border-collapse">
              <thead className="sticky top-0 bg-gray-100 z-10">
                <tr>
                  <th className="w-10 text-center text-xs text-gray-500 font-normal px-2 py-2 border-r border-gray-200 border-b">
                    #
                  </th>
                  {displayColumns.map((col) => (
                    <th
                      key={col.name}
                      className="text-left text-xs font-semibold text-gray-700 px-3 py-2 border-r border-gray-200 border-b whitespace-nowrap"
                    >
                      <div className="flex items-center gap-1">
                        <span
                          className={`text-xs px-1 py-0.5 rounded font-mono ${TYPE_COLORS[col.type]}`}
                        >
                          {col.type === 'numeric' ? '1.0' : col.type === 'factor' ? 'f' : 'ab'}
                        </span>
                        {col.name}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredData.map((row, rowIdx) => (
                  <tr key={rowIdx} className={rowIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="text-center text-xs text-gray-400 px-2 py-1.5 border-r border-gray-100">
                      {rowIdx + 1}
                    </td>
                    {displayColumns.map((col) => (
                      <td
                        key={col.name}
                        className="px-3 py-1.5 border-r border-gray-100 whitespace-nowrap font-mono text-xs"
                      >
                        {(row as any)[col.name] ?? <span className="text-gray-300">NA</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      }
      rightWidth="320px"
      right={<ScriptPanel />}
    />
  )
}
