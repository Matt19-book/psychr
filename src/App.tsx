/**
 * PsychR — Root Application Component
 *
 * Renders the main layout:
 *   ┌─────────────────────────────────────────────┐
 *   │  Tab Bar (7 workspace tabs)                  │
 *   ├─────────────────────────────────────────────┤
 *   │  Active Tab Workspace (fills remaining space) │
 *   └─────────────────────────────────────────────┘
 */

import { useEffect } from 'react'
import { usePsychrStore, AppTab } from './store'
import { TabBar } from './components/layout/TabBar'
import { StatusBar } from './components/layout/StatusBar'

// Tab workspaces
import { DataCleaningTab } from './tabs/DataCleaning/DataCleaningTab'
import { AnalyzeTab } from './tabs/Analyze/AnalyzeTab'
import { IRTTab } from './tabs/IRT/IRTTab'
import { QualitativeTab } from './tabs/Qualitative/QualitativeTab'
import { VisualizationTab } from './tabs/Visualization/VisualizationTab'
import { CitationsTab } from './tabs/Citations/CitationsTab'
import { MarkdownTab } from './tabs/Markdown/MarkdownTab'

const TAB_COMPONENTS: Record<AppTab, React.ComponentType> = {
  'data-cleaning': DataCleaningTab,
  'analyze': AnalyzeTab,
  'irt': IRTTab,
  'qualitative': QualitativeTab,
  'visualization': VisualizationTab,
  'citations': CitationsTab,
  'markdown': MarkdownTab,
}

export default function App() {
  const activeTab = usePsychrStore((s) => s.activeTab)
  const setRStatus = usePsychrStore((s) => s.setRStatus)

  // Check R availability on startup
  useEffect(() => {
    const checkR = async () => {
      try {
        const result = await window.psychr?.r?.check()
        if (result?.available) {
          const version = await window.psychr?.r?.version()
          setRStatus(true, version)
        } else {
          setRStatus(false)
        }
      } catch {
        // Running in browser dev mode without Electron
        setRStatus(false, 'Dev mode')
      }
    }
    checkR()
  }, [setRStatus])

  const ActiveTab = TAB_COMPONENTS[activeTab]

  return (
    <div className="flex flex-col h-screen bg-gray-50 overflow-hidden font-sans">
      <TabBar />
      <main className="flex-1 overflow-hidden">
        <ActiveTab />
      </main>
      <StatusBar />
    </div>
  )
}
