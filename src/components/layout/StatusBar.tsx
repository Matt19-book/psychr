import { usePsychrStore } from '../../store'

export function StatusBar() {
  const rAvailable = usePsychrStore((s) => s.rAvailable)
  const rVersion = usePsychrStore((s) => s.rVersion)
  const activeDataset = usePsychrStore((s) => s.activeDataset)
  const results = usePsychrStore((s) => s.results)

  return (
    <footer className="h-6 bg-psychr-blue flex items-center px-3 gap-4 text-xs text-blue-200 select-none">
      <span>
        R: {rAvailable ? `v${rVersion}` : 'not connected'}
      </span>
      {activeDataset && (
        <>
          <span className="text-blue-400">|</span>
          <span>
            Dataset: <span className="text-white">{activeDataset.name}</span>{' '}
            ({activeDataset.rows.toLocaleString()} rows × {activeDataset.columns.length} cols)
          </span>
        </>
      )}
      {results.length > 0 && (
        <>
          <span className="text-blue-400">|</span>
          <span>{results.length} result{results.length !== 1 ? 's' : ''} this session</span>
        </>
      )}
      <span className="ml-auto">PsychR v0.1.0</span>
    </footer>
  )
}
