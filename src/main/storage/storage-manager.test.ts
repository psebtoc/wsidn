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

import { getAppDataPath, ensureDir, readJson, writeJson } from './storage-manager'

// Normalize path separators for cross-platform comparison
const norm = (p: string) => p.replace(/\\/g, '/')

describe('storage-manager', () => {
  beforeEach(() => {
    fsMock.reset()
  })

  describe('getAppDataPath', () => {
    it('returns userData path with no segments', () => {
      expect(norm(getAppDataPath())).toBe('/mock/appdata')
    })

    it('joins single segment with userData path', () => {
      const result = norm(getAppDataPath('projects'))
      expect(result).toContain('projects')
      expect(result).toContain('/mock/appdata')
    })

    it('joins multiple segments with userData path', () => {
      const result = getAppDataPath('projects', 'abc', 'project.json')
      expect(result).toContain('projects')
      expect(result).toContain('abc')
      expect(result).toContain('project.json')
    })
  })

  describe('ensureDir', () => {
    it('calls mkdirSync with recursive option', () => {
      ensureDir('/some/dir')
      expect(fsMock.mkdirSync).toHaveBeenCalledWith('/some/dir', { recursive: true })
    })
  })

  describe('readJson', () => {
    it('returns default value when file does not exist', () => {
      const result = readJson('/nonexistent.json', { items: [] })
      expect(result).toEqual({ items: [] })
    })

    it('parses and returns JSON when file exists', () => {
      fsMock.seed('/data.json', JSON.stringify({ name: 'test', count: 42 }))
      const result = readJson<{ name: string; count: number }>('/data.json', {
        name: '',
        count: 0,
      })
      expect(result).toEqual({ name: 'test', count: 42 })
    })

    it('returns default value for empty array', () => {
      const result = readJson('/missing.json', [])
      expect(result).toEqual([])
    })
  })

  describe('writeJson', () => {
    it('creates parent directories before writing', () => {
      writeJson('/a/b/c/data.json', { hello: 'world' })
      expect(fsMock.mkdirSync).toHaveBeenCalled()
    })

    it('writes pretty-printed JSON', () => {
      writeJson('/out.json', { key: 'value' })
      const raw = fsMock.readRaw('/out.json')
      expect(raw).toBe(JSON.stringify({ key: 'value' }, null, 2))
    })

    it('writes arrays correctly', () => {
      writeJson('/arr.json', [1, 2, 3])
      const raw = fsMock.readRaw('/arr.json')
      expect(raw).toBe(JSON.stringify([1, 2, 3], null, 2))
    })
  })
})
