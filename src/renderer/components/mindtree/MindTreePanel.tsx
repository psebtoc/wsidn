import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Zap, Loader2 } from 'lucide-react'
import { useTodoStore } from '@renderer/stores/todo-store'
import { useSessionStore } from '@renderer/stores/session-store'
import { useConfigStore } from '@renderer/stores/config-store'
import { sessionService } from '@renderer/services/session-service'
import type { MindTreeCategory } from '@renderer/types/project'
import Tooltip from '@renderer/components/ui/Tooltip'
import MindTreeSection from './MindTreeSection'
import NoteSection from './NoteSection'

interface MindTreePanelProps {
  projectId: string
  sessionId: string       // = claudeSessionId
  wsidnSessionId: string  // WSIDN's own session UUID
  cwd: string
}

const CATEGORIES: MindTreeCategory[] = ['task', 'decision', 'note']
const HEADER_HEIGHT = 28 // section header height in px

export default function MindTreePanel({ projectId, sessionId, wsidnSessionId, cwd }: MindTreePanelProps) {
  const { t } = useTranslation()
  const todos = useTodoStore((s) => s.todos)
  const loading = useTodoStore((s) => s.loading)
  const loadTodos = useTodoStore((s) => s.loadTodos)

  const sessionManagerEnabled = useSessionStore((s) => s.sessionManagerEnabled[wsidnSessionId] ?? false)
  const toggleSessionManager = useSessionStore((s) => s.toggleSessionManager)

  const config = useConfigStore((s) => s.config)
  const updateConfig = useConfigStore((s) => s.updateConfig)
  const model = config.sessionManager?.model ?? 'haiku'

  const [smProcessing, setSmProcessing] = useState(false)

  // Flex-grow weights for each section (default equal)
  const [weights, setWeights] = useState<[number, number, number]>([1, 1, 1])
  const [collapsedSet, setCollapsedSet] = useState<Set<MindTreeCategory>>(new Set())
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadTodos(projectId, sessionId)
  }, [projectId, sessionId, loadTodos])

  // Subscribe to SESSION_MANAGER_PROCESSING events — show spinner while claude -p runs
  useEffect(() => {
    return sessionService.onSessionManagerProcessing((payload) => {
      if (payload.wsidnSessionId === wsidnSessionId) {
        setSmProcessing(true)
      }
    })
  }, [wsidnSessionId])

  // Subscribe to SESSION_MANAGER_UPDATED events — reload todos when our session is updated
  useEffect(() => {
    return sessionService.onSessionManagerUpdated((payload) => {
      if (payload.projectId === projectId && payload.claudeSessionId === sessionId) {
        setSmProcessing(false)
        loadTodos(projectId, sessionId)
      }
    })
  }, [projectId, sessionId, loadTodos])

  // Track processing state: set to true when prompt is submitted (use a brief spinner)
  // We watch the SESSION_MANAGER_UPDATED event to clear it (done above)
  // We also clear it after a timeout in case the update never arrives
  useEffect(() => {
    if (!smProcessing) return
    const timer = setTimeout(() => setSmProcessing(false), 30_000) // 30s max
    return () => clearTimeout(timer)
  }, [smProcessing])

  const handleToggle = useCallback(async () => {
    setSmProcessing(false)
    await toggleSessionManager(wsidnSessionId, projectId, cwd, sessionId)
  }, [toggleSessionManager, wsidnSessionId, projectId, cwd, sessionId])

  const handleModelChange = useCallback(
    async (newModel: 'haiku' | 'sonnet' | 'opus') => {
      await updateConfig({ sessionManager: { model: newModel } })
    },
    [updateConfig]
  )

  const itemsByCategory = useMemo(() => {
    const map: Record<MindTreeCategory, typeof todos> = { task: [], decision: [], note: [] }
    for (const todo of todos) {
      const cat = todo.category ?? 'task'
      if (map[cat]) map[cat].push(todo)
    }
    return map
  }, [todos])

  const toggleCollapse = useCallback((category: MindTreeCategory) => {
    setCollapsedSet((prev) => {
      const next = new Set(prev)
      if (next.has(category)) {
        next.delete(category)
      } else {
        next.add(category)
      }
      return next
    })
  }, [])

  // Build list of open section indices (for divider placement)
  const openIndices = useMemo(
    () => CATEGORIES.map((_, i) => i).filter((i) => !collapsedSet.has(CATEGORIES[i])),
    [collapsedSet]
  )

  // Divider drag
  const handleDividerMouseDown = useCallback((e: React.MouseEvent, dividerIdx: number) => {
    e.preventDefault()
    setDragIndex(dividerIdx)
  }, [])

  useEffect(() => {
    if (dragIndex === null) return

    document.body.style.cursor = 'row-resize'
    document.body.classList.add('select-none')

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const collapsedCount = collapsedSet.size
      const availableHeight = rect.height - collapsedCount * HEADER_HEIGHT

      if (availableHeight <= 0) return

      const aboveSectionIdx = openIndices[dragIndex]
      const belowSectionIdx = openIndices[dragIndex + 1]
      if (aboveSectionIdx === undefined || belowSectionIdx === undefined) return

      const mouseY = e.clientY - rect.top
      const totalWeight = weights[aboveSectionIdx] + weights[belowSectionIdx]

      let accY = 0
      let aboveTop = 0
      let belowBottom = 0
      for (let i = 0; i < CATEGORIES.length; i++) {
        if (collapsedSet.has(CATEGORIES[i])) {
          if (i === aboveSectionIdx) aboveTop = accY
          accY += HEADER_HEIGHT
          if (i === belowSectionIdx) belowBottom = accY
        } else {
          const w = weights[i]
          const totalOpenWeight = CATEGORIES.reduce(
            (sum, cat, idx) => sum + (collapsedSet.has(cat) ? 0 : weights[idx]),
            0
          )
          const sectionHeight = (w / totalOpenWeight) * availableHeight + HEADER_HEIGHT
          if (i === aboveSectionIdx) aboveTop = accY
          accY += sectionHeight
          if (i === belowSectionIdx) belowBottom = accY
        }
      }

      const pairRange = belowBottom - aboveTop
      const relativePos = (mouseY - aboveTop) / pairRange
      const clamped = Math.max(0.1, Math.min(0.9, relativePos))

      const newAbove = totalWeight * clamped
      const newBelow = totalWeight * (1 - clamped)

      setWeights((prev) => {
        const next = [...prev] as [number, number, number]
        next[aboveSectionIdx] = Math.max(0.1, newAbove)
        next[belowSectionIdx] = Math.max(0.1, newBelow)
        return next
      })
    }

    const handleMouseUp = () => {
      setDragIndex(null)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      document.body.style.cursor = ''
      document.body.classList.remove('select-none')
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [dragIndex, collapsedSet, openIndices, weights])

  // Compute section flex styles
  const sectionStyles = useMemo(() => {
    return CATEGORIES.map((cat, idx) => {
      if (collapsedSet.has(cat)) {
        return { flex: '0 0 auto' }
      }
      return { flex: `${weights[idx]} 0 0px` }
    })
  }, [collapsedSet, weights])

  // Determine where dividers go: between consecutive open sections
  const dividerPositions = useMemo(() => {
    const result: { afterIndex: number; dividerIdx: number }[] = []
    for (let i = 0; i < openIndices.length - 1; i++) {
      result.push({ afterIndex: openIndices[i], dividerIdx: i })
    }
    return result
  }, [openIndices])

  if (loading) {
    return (
      <div className="w-64 h-full bg-surface border-l border-border-default/50 flex items-center justify-center select-none shrink-0">
        <p className="text-xs text-fg-dim">Loading...</p>
      </div>
    )
  }

  return (
    <div className="w-64 h-full bg-surface border-l border-border-default/50 flex flex-col select-none shrink-0">
      {/* Header */}
      <div className="px-3 py-1.5 border-b border-border-subtle flex items-center gap-1.5">
        <span className="text-xs font-medium text-fg-secondary uppercase tracking-wider flex-1">
          {t('mindtree.title')}
        </span>

        {/* Model dropdown */}
        <select
          value={model}
          onChange={(e) => handleModelChange(e.target.value as 'haiku' | 'sonnet' | 'opus')}
          className="text-[10px] bg-elevated border border-border-input rounded px-1 py-0.5 text-fg-dim
                     outline-none focus:border-primary transition-colors cursor-pointer"
          title={t('mindtree.selectModel')}
        >
          <option value="haiku">haiku</option>
          <option value="sonnet">sonnet</option>
          <option value="opus">opus</option>
        </select>

        {/* Session Manager toggle */}
        <Tooltip content={sessionManagerEnabled ? t('mindtree.smDisable') : t('mindtree.smEnable')} side="bottom">
          <button
            onClick={handleToggle}
            className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
              sessionManagerEnabled
                ? 'bg-primary/20 text-primary'
                : 'text-fg-dim hover:text-fg-secondary hover:bg-elevated'
            }`}
          >
            {smProcessing ? (
              <Loader2 size={12} className="animate-spin" />
            ) : (
              <Zap size={12} />
            )}
          </button>
        </Tooltip>
      </div>

      {/* Sections container */}
      <div ref={containerRef} className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {CATEGORIES.map((cat, idx) => {
          const divider = dividerPositions.find((d) => d.afterIndex === idx)
          return (
            <div key={cat} className="flex flex-col min-h-0" style={sectionStyles[idx]}>
              {cat === 'note' ? (
                <NoteSection
                  noteItem={itemsByCategory.note[0] ?? null}
                  projectId={projectId}
                  sessionId={sessionId}
                  collapsed={collapsedSet.has(cat)}
                  onToggleCollapse={() => toggleCollapse(cat)}
                />
              ) : (
                <MindTreeSection
                  category={cat}
                  items={itemsByCategory[cat]}
                  projectId={projectId}
                  sessionId={sessionId}
                  collapsed={collapsedSet.has(cat)}
                  onToggleCollapse={() => toggleCollapse(cat)}
                />
              )}
              {/* Divider after this section */}
              {divider !== undefined && (
                <div
                  className="h-[1px] shrink-0 bg-border-subtle hover:bg-primary cursor-row-resize transition-colors relative"
                  onMouseDown={(e) => handleDividerMouseDown(e, divider.dividerIdx)}
                >
                  <div className="absolute -top-[2px] -bottom-[2px] left-0 right-0" />
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
