import { useEffect, useMemo, useRef, useState } from 'react'
import Editor, { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'
import { usePsychrStore, Dataset, DataColumn } from '../../store'
import { buildWorkspaceExecutionScript, sanitizeRObjectName } from '../../utils/r-script'

loader.config({ monaco })

function getAssignedObjectName(command: string): string | null {
  const match = command.match(/^\s*([A-Za-z.][A-Za-z0-9._]*)\s*(<-|=)\s*/m)
  return match?.[1] ?? null
}

function normalizeConsoleOutput(output: unknown): string[] {
  if (Array.isArray(output)) {
    return output.map((line) => String(line))
  }
  if (typeof output === 'string') {
    return [output]
  }
  if (output == null) {
    return []
  }
  return [String(output)]
}

function normalizeFrames(frames: unknown): Record<string, unknown>[] {
  if (Array.isArray(frames)) {
    return frames.filter((frame): frame is Record<string, unknown> => Boolean(frame) && typeof frame === 'object')
  }
  if (frames && typeof frames === 'object') {
    return [frames as Record<string, unknown>]
  }
  return []
}

function mapWorkspaceDatasets(
  frames: Record<string, unknown>[],
  existing: Dataset[],
): Dataset[] {
  const byName = new Map(existing.map((dataset) => [dataset.objectName, dataset]))

  return frames.map((frame) => {
    const objectName = String(frame.name)
    const previous = byName.get(objectName)

    return {
      id: previous?.id ?? `dataset_${objectName}`,
      name: previous?.name ?? objectName,
      objectName,
      path: previous?.path,
      rows: Number(frame.rows ?? 0),
      columns: (frame.columns as DataColumn[]) ?? [],
      data: (frame.full_data as Record<string, unknown>[]) ?? [],
      previewData: (frame.preview as Record<string, unknown>[]) ?? [],
      isDuckDB: false,
      importedAt: previous?.importedAt ?? new Date(),
    }
  })
}

export function RWorkspace() {
  const datasets = usePsychrStore((s) => s.datasets)
  const activeDataset = usePsychrStore((s) => s.activeDataset)
  const setActiveDatasetByObjectName = usePsychrStore((s) => s.setActiveDatasetByObjectName)
  const syncDatasets = usePsychrStore((s) => s.syncDatasets)
  const renameDatasetObject = usePsychrStore((s) => s.renameDatasetObject)
  const results = usePsychrStore((s) => s.results)
  const sessionScript = usePsychrStore((s) => s.sessionScript)
  const setSessionScript = usePsychrStore((s) => s.setSessionScript)
  const appendToScript = usePsychrStore((s) => s.appendToScript)
  const consoleHistory = usePsychrStore((s) => s.consoleHistory)
  const addConsoleEntry = usePsychrStore((s) => s.addConsoleEntry)
  const clearConsoleHistory = usePsychrStore((s) => s.clearConsoleHistory)

  const [consoleInput, setConsoleInput] = useState('')
  const [isRunningScript, setIsRunningScript] = useState(false)
  const [isRunningConsole, setIsRunningConsole] = useState(false)
  const [workspaceError, setWorkspaceError] = useState<string | null>(null)
  const [isEnvironmentVisible, setIsEnvironmentVisible] = useState(true)
  const [environmentWidth, setEnvironmentWidth] = useState(260)
  const [isDraggingEnvironment, setIsDraggingEnvironment] = useState(false)
  const workspaceRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!isDraggingEnvironment) return

    const handleMouseMove = (event: MouseEvent) => {
      const bounds = workspaceRef.current?.getBoundingClientRect()
      if (!bounds) return

      const nextWidth = bounds.right - event.clientX
      const minWidth = 180
      const maxWidth = Math.min(520, bounds.width - 320)
      setEnvironmentWidth(Math.max(minWidth, Math.min(maxWidth, nextWidth)))
    }

    const handleMouseUp = () => setIsDraggingEnvironment(false)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingEnvironment])

  const environmentSummary = useMemo(() => {
    return datasets.map((dataset) => ({
      objectName: dataset.objectName,
      label: dataset.name,
      rows: dataset.rows,
      cols: dataset.columns.length,
      isActive: dataset.id === activeDataset?.id,
    }))
  }, [datasets, activeDataset])

  const handleRenameDataset = (dataset: Dataset) => {
    const proposed = window.prompt('Rename active dataset object', dataset.objectName)
    if (!proposed) return

    const nextObjectName = sanitizeRObjectName(proposed)
    if (datasets.some((item) => item.id !== dataset.id && item.objectName === nextObjectName)) {
      setWorkspaceError(`An object named "${nextObjectName}" already exists.`)
      return
    }

    if (nextObjectName === dataset.objectName) return

    renameDatasetObject(dataset.id, nextObjectName)
    setActiveDatasetByObjectName(nextObjectName)
    appendToScript(`${nextObjectName} <- ${dataset.objectName}`)
  }

  const runWorkspaceCode = async (code: string, options: { mode: 'script' | 'console'; appendHistoryLabel?: string }) => {
    if (!window.psychr?.r?.run) {
      setWorkspaceError('R is not connected. Run the app via Electron (npm run dev) to execute code.')
      return
    }

    const wrappedScript = buildWorkspaceExecutionScript({
      datasets: datasets.map((dataset) => ({ objectName: dataset.objectName, data: dataset.data })),
      activeObjectName: activeDataset?.objectName,
      userCode: code,
      recordedScript: sessionScript,
      mode: options.mode,
    })

    const result = await window.psychr.r.run(wrappedScript)

    if (!result.success) {
      throw new Error(result.error || result.stderr || 'R error')
    }

    const payload = result as unknown as Record<string, unknown>
    const frames = normalizeFrames(payload.data_frames)
    const syncedDatasets = mapWorkspaceDatasets(frames, datasets)
    const assignedObjectName =
      options.mode === 'console'
        ? getAssignedObjectName(code)
        : null
    const nextActiveObjectName =
      (assignedObjectName && syncedDatasets.some((dataset) => dataset.objectName === assignedObjectName) && assignedObjectName) ||
      (payload.active_object as string | undefined) ||
      activeDataset?.objectName ||
      null

    syncDatasets(syncedDatasets, nextActiveObjectName)

    addConsoleEntry({
      id: `console_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      command: options.mode === 'script' ? '# Run Script' : code,
      output: normalizeConsoleOutput(payload.console_output),
      timestamp: new Date(),
    })
  }

  const handleRunScript = async () => {
    setIsRunningScript(true)
    setWorkspaceError(null)
    try {
      await runWorkspaceCode(sessionScript, { mode: 'script' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to run script'
      setWorkspaceError(message)
      addConsoleEntry({
        id: `console_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        command: '# Run Script',
        error: message,
        timestamp: new Date(),
      })
    } finally {
      setIsRunningScript(false)
    }
  }

  const handleRunConsole = async () => {
    if (!consoleInput.trim()) return
    setIsRunningConsole(true)
    setWorkspaceError(null)
    const command = consoleInput
    try {
      setConsoleInput('')
      await runWorkspaceCode(command, { mode: 'console' })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to run console command'
      setWorkspaceError(message)
      addConsoleEntry({
        id: `console_${Date.now()}_${Math.random().toString(36).slice(2)}`,
        command,
        error: message,
        timestamp: new Date(),
      })
    } finally {
      setIsRunningConsole(false)
    }
  }

  return (
    <div ref={workspaceRef} className={`h-full bg-gray-950 text-white flex ${isDraggingEnvironment ? 'select-none cursor-col-resize' : ''}`}>
      <div className="flex-1 min-w-0 flex flex-col border-r border-gray-800">
        <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-gray-900">
          <div>
            <p className="text-xs font-semibold text-gray-200">R Workspace</p>
            <p className="text-[11px] text-gray-400">Source on top, console below, all in one session model</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigator.clipboard.writeText(sessionScript).catch(() => {})}
              className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-200 hover:bg-gray-700"
            >
              Copy Script
            </button>
            <button
              onClick={handleRunScript}
              disabled={isRunningScript}
              className="text-xs px-3 py-1 rounded bg-green-600 text-white hover:bg-green-500 disabled:opacity-50"
            >
              {isRunningScript ? 'Running…' : 'Run Script'}
            </button>
          </div>
        </div>

        <div className="h-[52%] min-h-0 border-b border-gray-800">
          <Editor
            height="100%"
            defaultLanguage="r"
            theme="vs-dark"
            value={sessionScript}
            onChange={(value) => setSessionScript(value ?? '')}
            options={{
              fontSize: 12,
              fontFamily: 'JetBrains Mono, Fira Code, monospace',
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        </div>

        <div className="flex-1 min-h-0 flex flex-col">
          <div className="flex items-center justify-between px-3 py-2 border-b border-gray-800 bg-gray-900">
            <div>
              <p className="text-xs font-semibold text-gray-200">Console</p>
              <p className="text-[11px] text-gray-400">
                {activeDataset ? `Active dataset: ${activeDataset.objectName}` : 'No active dataset'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={clearConsoleHistory}
                className="text-xs px-2 py-1 rounded bg-gray-800 text-gray-200 hover:bg-gray-700"
              >
                Clear
              </button>
              <button
                onClick={handleRunConsole}
                disabled={isRunningConsole || !consoleInput.trim()}
                className="text-xs px-3 py-1 rounded bg-psychr-midblue text-white hover:bg-psychr-blue disabled:opacity-50"
              >
                {isRunningConsole ? 'Running…' : 'Run Console'}
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-auto px-3 py-3 space-y-3 bg-black">
            {consoleHistory.map((entry) => (
              <div key={entry.id} className="border border-gray-800 rounded bg-gray-950 overflow-hidden">
                <div className="px-3 py-2 border-b border-gray-800 text-[11px] text-gray-400 flex items-center justify-between">
                  <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                  <button
                    onClick={() => appendToScript(entry.command)}
                    className="text-[11px] px-2 py-0.5 rounded bg-gray-800 text-gray-200 hover:bg-gray-700"
                  >
                    Append to Script
                  </button>
                </div>
                <pre className="px-3 py-2 text-xs text-green-400 whitespace-pre-wrap font-mono">{entry.command}</pre>
                {entry.output && entry.output.length > 0 && (
                  <pre className="px-3 pb-2 text-xs text-gray-200 whitespace-pre-wrap font-mono">{entry.output.join('\n')}</pre>
                )}
                {entry.error && (
                  <pre className="px-3 pb-2 text-xs text-red-400 whitespace-pre-wrap font-mono">{entry.error}</pre>
                )}
              </div>
            ))}
            {consoleHistory.length === 0 && (
              <p className="text-xs text-gray-500">Console history will appear here as you run commands.</p>
            )}
          </div>

          <div className="border-t border-gray-800 p-3 bg-gray-950">
            <textarea
              value={consoleInput}
              onChange={(e) => setConsoleInput(e.target.value)}
              placeholder="Type R commands here. Use the script pane above for curated, reproducible code."
              className="w-full h-28 resize-none rounded border border-gray-800 bg-black px-3 py-2 text-xs text-gray-100 font-mono focus:outline-none focus:ring-1 focus:ring-psychr-midblue"
              spellCheck={false}
            />
            {workspaceError && (
              <p className="mt-2 text-xs text-red-400 whitespace-pre-wrap">{workspaceError}</p>
            )}
          </div>
        </div>
      </div>

      {isEnvironmentVisible ? (
        <>
          <button
            type="button"
            aria-label="Resize environment pane"
            onMouseDown={() => setIsDraggingEnvironment(true)}
            className="w-2 shrink-0 bg-gray-900 border-l border-r border-gray-800 hover:bg-gray-800 cursor-col-resize"
          />

          <aside
            className="shrink-0 bg-gray-900 flex flex-col"
            style={{ width: `${environmentWidth}px` }}
          >
            <div className="px-3 py-2 border-b border-gray-800 flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-gray-200">Environment</p>
                <p className="text-[11px] text-gray-400">Switch data frames and inspect what exists</p>
              </div>
              <button
                onClick={() => setIsEnvironmentVisible(false)}
                className="text-[11px] px-2 py-0.5 rounded bg-gray-800 text-gray-200 hover:bg-gray-700"
              >
                Hide
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="px-3 py-2 border-b border-gray-800">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Data</p>
                <div className="mt-2 space-y-2">
                  {environmentSummary.map((item) => (
                    <div
                      key={item.objectName}
                      className={`rounded border px-2 py-2 transition-colors ${
                        item.isActive
                          ? 'border-psychr-midblue bg-psychr-midblue/20'
                          : 'border-gray-800 bg-gray-950'
                      }`}
                    >
                      <button
                        onClick={() => setActiveDatasetByObjectName(item.objectName)}
                        className="w-full text-left"
                      >
                        <p className="text-xs font-semibold text-white">{item.objectName}</p>
                        <p className="text-[11px] text-gray-400 truncate">{item.label}</p>
                        <p className="text-[11px] text-gray-500">{item.rows.toLocaleString()} rows × {item.cols} cols</p>
                      </button>
                      <div className="mt-2 flex gap-2">
                        <button
                          onClick={() => setActiveDatasetByObjectName(item.objectName)}
                          className="text-[11px] px-2 py-0.5 rounded bg-gray-800 text-gray-200 hover:bg-gray-700"
                        >
                          Set Active
                        </button>
                        <button
                          onClick={() => {
                            const dataset = datasets.find((entry) => entry.objectName === item.objectName)
                            if (dataset) handleRenameDataset(dataset)
                          }}
                          className="text-[11px] px-2 py-0.5 rounded bg-gray-800 text-gray-200 hover:bg-gray-700"
                        >
                          Rename
                        </button>
                      </div>
                    </div>
                  ))}
                  {environmentSummary.length === 0 && (
                    <p className="text-xs text-gray-500">Imported and derived data frames will appear here.</p>
                  )}
                </div>
              </div>

              <div className="px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-500">Results</p>
                <div className="mt-2 space-y-2">
                  {results.map((result) => (
                    <div key={result.id} className="rounded border border-gray-800 bg-gray-950 px-2 py-2">
                      <p className="text-xs font-semibold text-white truncate">{result.label}</p>
                      <p className="text-[11px] text-gray-500">{result.type}</p>
                    </div>
                  ))}
                  {results.length === 0 && (
                    <p className="text-xs text-gray-500">Analysis results will appear here.</p>
                  )}
                </div>
              </div>
            </div>
          </aside>
        </>
      ) : (
        <button
          onClick={() => setIsEnvironmentVisible(true)}
          className="shrink-0 w-10 border-l border-gray-800 bg-gray-900 hover:bg-gray-800 text-[11px] font-semibold tracking-wide text-gray-300 uppercase [writing-mode:vertical-rl] rotate-180"
        >
          Environment
        </button>
      )}
    </div>
  )
}
