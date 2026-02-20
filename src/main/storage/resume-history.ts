import { existsSync, unlinkSync } from 'fs'
import { getAppDataPath, readJson, writeJson } from './storage-manager'

export interface ResumeHistoryEntry {
  claudeSessionId: string
  sessionName: string
  claudeLastTitle: string | null
  closedAt: string
}

const MAX_ENTRIES = 50

function resumeHistoryPath(projectId: string): string {
  return getAppDataPath('projects', projectId, 'resume-history.json')
}

export function readResumeHistory(projectId: string): ResumeHistoryEntry[] {
  return readJson<ResumeHistoryEntry[]>(resumeHistoryPath(projectId), [])
}

export function appendResumeHistory(projectId: string, entry: ResumeHistoryEntry): void {
  const filePath = resumeHistoryPath(projectId)
  const entries = readJson<ResumeHistoryEntry[]>(filePath, [])

  // Remove duplicate if same claudeSessionId exists
  const filtered = entries.filter((e) => e.claudeSessionId !== entry.claudeSessionId)
  filtered.push(entry)

  // FIFO: keep only the last MAX_ENTRIES
  const trimmed = filtered.length > MAX_ENTRIES ? filtered.slice(-MAX_ENTRIES) : filtered
  writeJson(filePath, trimmed)
}

/**
 * One-time migration: extract resume-worthy entries from legacy sessions.json,
 * write them to resume-history.json, then delete sessions.json.
 */
export function migrateLegacySessions(projectId: string): void {
  const sessionsPath = getAppDataPath('projects', projectId, 'sessions.json')
  if (!existsSync(sessionsPath)) return

  interface LegacySession {
    id: string
    name: string
    status: 'active' | 'closed'
    lastClaudeSessionId: string | null
    claudeLastTitle: string | null
  }

  const sessions = readJson<LegacySession[]>(sessionsPath, [])
  const resumeEntries: ResumeHistoryEntry[] = []

  for (const s of sessions) {
    if (s.lastClaudeSessionId) {
      resumeEntries.push({
        claudeSessionId: s.lastClaudeSessionId,
        sessionName: s.name,
        claudeLastTitle: s.claudeLastTitle ?? null,
        closedAt: new Date().toISOString(),
      })
    }
  }

  if (resumeEntries.length > 0) {
    const filePath = resumeHistoryPath(projectId)
    const existing = readJson<ResumeHistoryEntry[]>(filePath, [])
    const merged = [...existing, ...resumeEntries].slice(-MAX_ENTRIES)
    writeJson(filePath, merged)
  }

  // Remove legacy file
  unlinkSync(sessionsPath)
}
