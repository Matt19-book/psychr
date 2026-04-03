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

import { ReactNode, useEffect, useMemo, useRef, useState } from 'react'

interface WorkspaceLayoutProps {
  left?: ReactNode
  leftWidth?: string
  center: ReactNode
  right?: ReactNode
  rightWidth?: string
  rightResizable?: boolean
  rightCollapsible?: boolean
  rightTabLabel?: string
  rightMinWidth?: number
}

function parsePixelWidth(value: string, fallback: number): number {
  const parsed = Number.parseInt(value, 10)
  return Number.isFinite(parsed) ? parsed : fallback
}

export function WorkspaceLayout({
  left,
  leftWidth = '280px',
  center,
  right,
  rightWidth = '340px',
  rightResizable = false,
  rightCollapsible = false,
  rightTabLabel = 'Panel',
  rightMinWidth = 320,
}: WorkspaceLayoutProps) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const initialRightWidth = useMemo(() => parsePixelWidth(rightWidth, 340), [rightWidth])
  const [currentRightWidth, setCurrentRightWidth] = useState(initialRightWidth)
  const [isRightVisible, setIsRightVisible] = useState(true)
  const [isDraggingRight, setIsDraggingRight] = useState(false)

  useEffect(() => {
    setCurrentRightWidth(initialRightWidth)
  }, [initialRightWidth])

  useEffect(() => {
    if (!isDraggingRight) return

    const handleMouseMove = (event: MouseEvent) => {
      const bounds = containerRef.current?.getBoundingClientRect()
      if (!bounds) return

      const nextWidth = bounds.right - event.clientX
      const maxWidth = Math.max(rightMinWidth, bounds.width - 180)
      setCurrentRightWidth(Math.max(rightMinWidth, Math.min(maxWidth, nextWidth)))
    }

    const handleMouseUp = () => setIsDraggingRight(false)

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [isDraggingRight, rightMinWidth])

  return (
    <div
      ref={containerRef}
      className={`flex h-full overflow-hidden ${isDraggingRight ? 'select-none cursor-col-resize' : ''}`}
    >
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
      {right && isRightVisible && (rightResizable || rightCollapsible) && (
        <div className="shrink-0 flex">
          {rightResizable && (
            <button
              type="button"
              aria-label={`Resize ${rightTabLabel}`}
              onMouseDown={() => setIsDraggingRight(true)}
              className="w-2 bg-gray-100 border-l border-r border-gray-200 hover:bg-gray-200 cursor-col-resize"
            />
          )}
          {rightCollapsible && (
            <button
              onClick={() => setIsRightVisible(false)}
              className="w-8 bg-gray-100 border-r border-gray-200 hover:bg-gray-200 text-[11px] font-semibold tracking-wide text-gray-600 uppercase [writing-mode:vertical-rl] rotate-180"
            >
              Hide
            </button>
          )}
        </div>
      )}
      {right && isRightVisible && (
        <aside
          className="flex-shrink-0 bg-gray-50 border-l border-gray-200 overflow-y-auto"
          style={{ width: rightResizable ? `${currentRightWidth}px` : rightWidth }}
        >
          {right}
        </aside>
      )}
      {right && rightCollapsible && !isRightVisible && (
        <button
          onClick={() => setIsRightVisible(true)}
          className="shrink-0 w-10 border-l border-gray-200 bg-gray-100 hover:bg-gray-200 text-[11px] font-semibold tracking-wide text-gray-600 uppercase [writing-mode:vertical-rl] rotate-180"
        >
          {rightTabLabel}
        </button>
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
