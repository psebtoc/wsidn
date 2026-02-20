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

