/**
 * WorkspaceLayout — Standard 3-panel layout used by all tabs.
 *
 *   ┌──────────┬──────────────────────────┬────────────────┐
 *   │  Left    │        Center            │     Right      │
 *   │  Panel   │     (main content)       │    (output/    │
 *   │ (controls│                          │     script)    │
 *   └──────────┴──────────────────────────┴────────────────┘
 *
 * Left and right panels are optional and have configurable widths.
 */

import { ReactNode } from 'react'

interface WorkspaceLayoutProps {
  left?: ReactNode
  leftWidth?: string
  center: ReactNode
  right?: ReactNode
  rightWidth?: string
}

export function WorkspaceLayout({
  left,
  leftWidth = '280px',
  center,
  right,
  rightWidth = '340px',
}: WorkspaceLayoutProps) {
  return (
    <div className="flex h-full overflow-hidden">
      {left && (
        <aside
          className="flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto"
          style={{ width: leftWidth }}
        >
          {left}
        </aside>
      )}
      <main className="flex-1 overflow-hidden min-w-0">
        {center}
      </main>
      {right && (
        <aside
          className="flex-shrink-0 bg-gray-50 border-l border-gray-200 overflow-y-auto"
          style={{ width: rightWidth }}
        >
          {right}
        </aside>
      )}
    </div>
  )
}

// ─── Panel Header ─────────────────────────────────────────────────────────────

interface PanelHeaderProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function PanelHeader({ title, subtitle, actions }: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 bg-white sticky top-0 z-10">
      <div>
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}
