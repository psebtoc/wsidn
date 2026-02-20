import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { createPortal } from 'react-dom'
import { Search } from 'lucide-react'

interface ResumableSession {
  id: string
  claudeSessionId: string
  claudeLastTitle: string | null
  name: string
  closedAt: string
}

interface SessionContextMenuProps {
  anchor: DOMRect
  onClose: () => void
  onSelectClaude: () => void
  onSelectClaudeDangerously: () => void
  onSelectWorktree: () => void
  resumableSessions: ResumableSession[]
  onResume: (claudeSessionId: string) => void
}

export default function SessionContextMenu({
  anchor,
  onClose,
  onSelectClaude,
  onSelectClaudeDangerously,
  onSelectWorktree,
  resumableSessions,
  onResume
}: SessionContextMenuProps) {
  const { t } = useTranslation()

  const formatClosedAt = useCallback((iso: string): string => {
    const d = new Date(iso)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    const diffHour = Math.floor(diffMs / 3600000)
    const diffDay = Math.floor(diffMs / 86400000)

    if (diffMin < 1) return t('contextMenu.timeJustNow')
    if (diffMin < 60) return t('contextMenu.timeMinAgo', { count: diffMin })
    if (diffHour < 24) return t('contextMenu.timeHourAgo', { count: diffHour })
    if (diffDay < 7) return t('contextMenu.timeDayAgo', { count: diffDay })

    const month = d.getMonth() + 1
    const day = d.getDate()
    const hours = d.getHours().toString().padStart(2, '0')
    const mins = d.getMinutes().toString().padStart(2, '0')
    return `${month}/${day} ${hours}:${mins}`
  }, [t])

  const [showResume, setShowResume] = useState(false)
  const [submenuFlipX, setSubmenuFlipX] = useState(false)
  const [flipY, setFlipY] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const resumeTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const submenuRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Position: below the anchor, flip if overflows
  const [pos, setPos] = useState({ top: 0, left: 0 })

  useEffect(() => {
    const menuWidth = 220
    const top = anchor.bottom + 4
    // Right-align: menu's right edge aligns with anchor's right edge
    let left = anchor.right - menuWidth
    // If it goes off the left edge, clamp to 0
    if (left < 0) left = 0
    const needFlipY = top + 200 > window.innerHeight
    setFlipY(needFlipY)
    setPos({
      top: needFlipY ? anchor.top - 4 : top,
      left,
    })
  }, [anchor])

  // Close on outside click or Escape
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (
        menuRef.current && !menuRef.current.contains(e.target as Node) &&
        (!submenuRef.current || !submenuRef.current.contains(e.target as Node))
      ) {
        onClose()
      }
    }
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    // Defer to avoid immediate close from the click that opened the menu
    const id = setTimeout(() => {
      window.addEventListener('mousedown', handleClick)
      window.addEventListener('keydown', handleKey)
    }, 0)
    return () => {
      clearTimeout(id)
      window.removeEventListener('mousedown', handleClick)
      window.removeEventListener('keydown', handleKey)
    }
  }, [onClose])

  // Check submenu direction when showing — prefer left (since menu is right-aligned)
  useEffect(() => {
    if (showResume && menuRef.current) {
      const rect = menuRef.current.getBoundingClientRect()
      // Flip to right only if there's no room on the left
      setSubmenuFlipX(rect.left - 200 < 0)
    }
  }, [showResume])

  // Focus search input when submenu opens
  useEffect(() => {
    if (showResume) {
      setSearchQuery('')
      requestAnimationFrame(() => searchInputRef.current?.focus())
    }
  }, [showResume])

  const handleResumeEnter = useCallback(() => {
    clearTimeout(resumeTimerRef.current)
    if (resumableSessions.length > 0) {
      resumeTimerRef.current = setTimeout(() => setShowResume(true), 150)
    }
  }, [resumableSessions])

  const handleResumeLeave = useCallback(() => {
    clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = setTimeout(() => setShowResume(false), 200)
  }, [])

  const handleSubmenuEnter = useCallback(() => {
    clearTimeout(resumeTimerRef.current)
  }, [])

  const handleSubmenuLeave = useCallback(() => {
    clearTimeout(resumeTimerRef.current)
    resumeTimerRef.current = setTimeout(() => setShowResume(false), 200)
  }, [])

  useEffect(() => {
    return () => clearTimeout(resumeTimerRef.current)
  }, [])

  const filteredSessions = useMemo(() => {
    if (!searchQuery.trim()) return resumableSessions
    const q = searchQuery.toLowerCase()
    return resumableSessions.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.claudeLastTitle && s.claudeLastTitle.toLowerCase().includes(q)) ||
        s.claudeSessionId.toLowerCase().includes(q)
    )
  }, [resumableSessions, searchQuery])

  const hasResumable = resumableSessions.length > 0

  const itemClass =
    'w-full text-left px-3 py-1.5 text-xs text-fg-secondary hover:bg-hover/60 transition-colors rounded-sm flex items-center justify-between'
  const disabledClass =
    'w-full text-left px-3 py-1.5 text-xs text-fg-dim cursor-default rounded-sm flex items-center justify-between'

  return createPortal(
    <>
      <div
        ref={menuRef}
        className="fixed z-[9999] min-w-[220px] py-1 bg-elevated border border-border-default rounded-md shadow-xl shadow-black/50"
        style={{
          top: pos.top,
          left: pos.left,
          transform: flipY ? 'translateY(-100%)' : undefined,
        }}
      >
        <button
          className={itemClass}
          onClick={() => { onSelectClaude(); onClose() }}
        >
          claude
        </button>
        <button
          className={itemClass}
          onClick={() => { onSelectClaudeDangerously(); onClose() }}
        >
          claude --skip-permissions
        </button>
        <div className="h-px bg-border-default my-1 mx-2" />
        <button
          className={itemClass}
          onClick={() => { onSelectWorktree(); onClose() }}
        >
          {t('contextMenu.worktree')}
        </button>
        <div className="h-px bg-border-default my-1 mx-2" />
        <div
          onMouseEnter={handleResumeEnter}
          onMouseLeave={handleResumeLeave}
          className="relative"
        >
          <button data-resume-trigger className={hasResumable ? itemClass : disabledClass}>
            <span>{t('contextMenu.resume')}</span>
            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M9 18l6-6-6-6" />
            </svg>
          </button>

          {/* Cascading submenu */}
          {showResume && hasResumable && (
            <div
              ref={submenuRef}
              onMouseEnter={handleSubmenuEnter}
              onMouseLeave={handleSubmenuLeave}
              className="fixed z-[10000] min-w-[240px] max-w-[340px] max-h-[360px] flex flex-col bg-elevated border border-border-default rounded-md shadow-xl shadow-black/50"
              style={{
                top: (() => {
                  const el = menuRef.current?.querySelector('[data-resume-trigger]')
                  if (el) {
                    const r = el.getBoundingClientRect()
                    return r.top
                  }
                  return pos.top
                })(),
                left: submenuFlipX
                  ? (menuRef.current?.getBoundingClientRect().right ?? pos.left + 220)
                  : (menuRef.current?.getBoundingClientRect().left ?? pos.left) - 240,
              }}
            >
              {/* Search field */}
              <div className="px-2 pt-2 pb-1 shrink-0">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-surface border border-border-input rounded text-xs">
                  <Search size={11} className="text-fg-dim shrink-0" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={t('contextMenu.searchResume', 'Search...')}
                    className="flex-1 bg-transparent text-fg-secondary placeholder-fg-dim outline-none min-w-0"
                  />
                </div>
              </div>

              {/* Session list */}
              <div className="overflow-y-auto py-1 min-h-0">
                {filteredSessions.length === 0 ? (
                  <div className="px-3 py-2 text-[10px] text-fg-dim text-center">
                    {t('contextMenu.noResults', 'No results')}
                  </div>
                ) : (
                  filteredSessions.map((s) => (
                    <button
                      key={s.claudeSessionId}
                      className="w-full text-left px-3 py-1.5 hover:bg-hover/60 transition-colors rounded-sm"
                      onClick={() => { onResume(s.claudeSessionId); onClose() }}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-fg-secondary truncate">{s.name}</span>
                        <span className="text-[10px] text-fg-dim shrink-0 tabular-nums">
                          {formatClosedAt(s.closedAt)}
                        </span>
                      </div>
                      {s.claudeLastTitle && (
                        <span className="block text-[10px] text-fg-dim truncate mt-0.5">
                          {s.claudeLastTitle}
                        </span>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>,
    document.body
  )
}
