/**
 * TabBar — The 7 workspace tabs at the top of PsychR.
 *
 * Each tab icon + label maps to a workspace. The active tab is
 * highlighted; clicking switches the view.
 */

import { AppTab, usePsychrStore } from '../../store'

interface TabDef {
  id: AppTab
  label: string
  shortLabel: string
  icon: string
  description: string
}

const TABS: TabDef[] = [
  {
    id: 'data-cleaning',
    label: 'Data',
    shortLabel: 'Data',
    icon: '🗃',
    description: 'Import, clean, and wrangle your dataset',
  },
  {
    id: 'analyze',
    label: 'Analyze',
    shortLabel: 'Analyze',
    icon: '📊',
    description: 'Statistical analyses: ANOVA, regression, CFA, and more',
  },
  {
    id: 'irt',
    label: 'IRT',
    shortLabel: 'IRT',
    icon: '📐',
    description: 'Item Response Theory: Rasch, 2PL, 3PL, GRM',
  },
  {
    id: 'qualitative',
    label: 'Qualitative',
    shortLabel: 'Qual',
    icon: '💬',
    description: 'Qualitative coding and thematic analysis',
  },
  {
    id: 'visualization',
    label: 'Visualize',
    shortLabel: 'Viz',
    icon: '🎨',
    description: 'ggplot2 chart builder — no code required',
  },
  {
    id: 'citations',
    label: 'Citations',
    shortLabel: 'Cite',
    icon: '📚',
    description: 'DOI-to-APA reference manager',
  },
  {
    id: 'markdown',
    label: 'Report',
    shortLabel: 'Report',
    icon: '📝',
    description: 'Quarto/Markdown report editor',
  },
]

export function TabBar() {
  const activeTab = usePsychrStore((s) => s.activeTab)
  const setActiveTab = usePsychrStore((s) => s.setActiveTab)
  const rAvailable = usePsychrStore((s) => s.rAvailable)

  return (
    <header className="bg-white border-b border-gray-200 shadow-sm select-none">
      {/* App title bar */}
      <div className="flex items-center px-4 py-2 bg-psychr-blue">
        <div className="flex items-center gap-2">
          <span className="text-white font-bold text-lg tracking-tight">PsychR</span>
          <span className="text-blue-200 text-xs font-normal">v0.1.0 — beta</span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* R status indicator */}
          <div className="flex items-center gap-1.5">
            <div
              className={`w-2 h-2 rounded-full ${rAvailable ? 'bg-green-400' : 'bg-red-400'}`}
            />
            <span className="text-blue-200 text-xs">
              {rAvailable ? 'R connected' : 'R not found'}
            </span>
          </div>
        </div>
      </div>

      {/* Tab row */}
      <nav className="flex items-stretch overflow-x-auto">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              title={tab.description}
              className={`
                flex items-center gap-2 px-5 py-2.5 text-sm font-medium
                border-b-2 transition-colors whitespace-nowrap
                ${isActive
                  ? 'border-psychr-midblue text-psychr-midblue bg-psychr-accent'
                  : 'border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }
              `}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.shortLabel}</span>
            </button>
          )
        })}
      </nav>
    </header>
  )
}
