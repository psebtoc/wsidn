import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FsMemory } from '../../../test/mocks/fs-memory'

// eslint-disable-next-line no-var
var fsMock: FsMemory

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/appdata'),
  },
}))

vi.mock('fs', async () => {
  const { createFsMemory } = await import('../../../test/mocks/fs-memory')
  fsMock = createFsMemory()
  return fsMock
})

import { readResumeHistory, appendResumeHistory } from './resume-history'

const PROJECT_ID = 'proj-1'
const HISTORY_PATH = `/mock/appdata/projects/${PROJECT_ID}/resume-history.json`

function makeEntry(
  claudeSessionId: string,
  sessionName = 'Session'
): {
  claudeSessionId: string
  sessionName: string
  claudeLastTitle: string | null
  closedAt: string
} {
  return {
    claudeSessionId,
    sessionName,
    claudeLastTitle: null,
    closedAt: new Date().toISOString(),
  }
}

describe('resume-history', () => {
  beforeEach(() => {
    fsMock.reset()
  })

  describe('readResumeHistory', () => {
    it('returns empty array when file does not exist', () => {
      expect(readResumeHistory(PROJECT_ID)).toEqual([])
    })

    it('returns stored entries', () => {
      const entries = [makeEntry('cs-1'), makeEntry('cs-2')]
      fsMock.seed(HISTORY_PATH, JSON.stringify(entries))
      expect(readResumeHistory(PROJECT_ID)).toHaveLength(2)
    })
  })

  describe('appendResumeHistory', () => {
    it('adds entry to empty history', () => {
      appendResumeHistory(PROJECT_ID, makeEntry('cs-1'))
      const result = readResumeHistory(PROJECT_ID)
      expect(result).toHaveLength(1)
      expect(result[0].claudeSessionId).toBe('cs-1')
    })

    it('deduplicates by claudeSessionId', () => {
      appendResumeHistory(PROJECT_ID, makeEntry('cs-1', 'First'))
      appendResumeHistory(PROJECT_ID, makeEntry('cs-1', 'Updated'))
      const result = readResumeHistory(PROJECT_ID)
      expect(result).toHaveLength(1)
      expect(result[0].sessionName).toBe('Updated')
    })

    it('enforces FIFO cap of 50 entries', () => {
      // Seed 50 entries
      const entries = Array.from({ length: 50 }, (_, i) => makeEntry(`cs-${i}`))
      fsMock.seed(HISTORY_PATH, JSON.stringify(entries))

      // Add one more - should evict the oldest
      appendResumeHistory(PROJECT_ID, makeEntry('cs-new'))
      const result = readResumeHistory(PROJECT_ID)
      expect(result).toHaveLength(50)
      expect(result[0].claudeSessionId).toBe('cs-1') // cs-0 evicted
      expect(result[result.length - 1].claudeSessionId).toBe('cs-new')
    })

    it('appends without eviction when under cap', () => {
      appendResumeHistory(PROJECT_ID, makeEntry('cs-1'))
      appendResumeHistory(PROJECT_ID, makeEntry('cs-2'))
      appendResumeHistory(PROJECT_ID, makeEntry('cs-3'))
      expect(readResumeHistory(PROJECT_ID)).toHaveLength(3)
    })
  })
})
