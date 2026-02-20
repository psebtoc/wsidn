import { useEffect, useState, useRef, useCallback, useMemo } from 'react'
import { useTodoStore } from '@renderer/stores/todo-store'
import type { MindTreeCategory } from '@renderer/types/project'
import MindTreeSection from './MindTreeSection'
import NoteSection from './NoteSection'

interface MindTreePanelProps {
  projectId: string
  sessionId: string
}

const CATEGORIES: MindTreeCategory[] = ['task', 'decision', 'note']
const HEADER_HEIGHT = 28 // section header height in px

export default function MindTreePanel({ projectId, sessionId }: MindTreePanelProps) {
  const todos = useTodoStore((s) => s.todos)
  const loading = useTodoStore((s) => s.loading)
  const loadTodos = useTodoStore((s) => s.loadTodos)

  // Flex-grow weights for each section (default equal)
  const [weights, setWeights] = useState<[number, number, number]>([1, 1, 1])
  const [collapsedSet, setCollapsedSet] = useState<Set<MindTreeCategory>>(new Set())
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadTodos(projectId, sessionId)
  }, [projectId, sessionId, loadTodos])

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

      // The divider at dragIndex sits between openIndices[dragIndex] and openIndices[dragIndex+1]
      const aboveSectionIdx = openIndices[dragIndex]
      const belowSectionIdx = openIndices[dragIndex + 1]
      if (aboveSectionIdx === undefined || belowSectionIdx === undefined) return

      // Calculate cumulative header heights above the two sections
      let headersBefore = 0
      for (let i = 0; i < CATEGORIES.length; i++) {
        if (i <= aboveSectionIdx && collapsedSet.has(CATEGORIES[i])) {
          headersBefore += HEADER_HEIGHT
        }
      }
      // Also count headers of open sections above the pair
      for (let i = 0; i < openIndices.length; i++) {
        if (openIndices[i] < aboveSectionIdx) {
          // This open section's header is part of the layout
        }
      }

      // Simpler approach: compute mouse position relative to container,
      // then compute weights proportionally
      const mouseY = e.clientY - rect.top

      // Calculate the position range where this divider can move
      // = after above section's start, before below section's end
      // For simplicity, just adjust the weight ratio between the two sections
      const totalWeight = weights[aboveSectionIdx] + weights[belowSectionIdx]

      // Get the top of the above section and bottom of below section in pixels
      // by computing layout positions
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
      <div className="px-3 py-2 border-b border-border-subtle flex items-center">
        <span className="text-xs font-medium text-fg-secondary uppercase tracking-wider">
          Mind Tree
        </span>
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
