import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { FsMemory } from '../../../test/mocks/fs-memory'

// var avoids TDZ — the async factory assigns this before any module-level code runs
// eslint-disable-next-line no-var
var fsMock: FsMemory

vi.mock('electron', () => ({
  app: {
    getPath: vi.fn(() => '/mock/appdata'),
  },
}))

// Async factory: await import() resolves TypeScript through Vite's pipeline.
// fsMock (var) is assigned DURING factory execution, before storage-manager uses fs.
vi.mock('fs', async () => {
  const { createFsMemory } = await import('../../../test/mocks/fs-memory')
  fsMock = createFsMemory()
  return fsMock
})

vi.mock('uuid', () => {
  let counter = 0
  return {
    v4: vi.fn(() => `uuid-${++counter}`),
  }
})

import {
  listProjects,
  createProject,
  deleteProject,
  getProject,
  updateProject,
} from './project-storage'

describe('project-storage', () => {
  beforeEach(() => {
    fsMock.reset()
  })

  describe('listProjects', () => {
    it('returns empty array when projects dir does not exist', () => {
      expect(listProjects()).toEqual([])
    })

    it('returns empty array when projects dir is empty', () => {
      fsMock.seedDir('/mock/appdata/projects')
      expect(listProjects()).toEqual([])
    })

    it('returns valid projects from subdirectories', () => {
      const project = {
        id: 'p1',
        name: 'Test',
        path: '/code/test',
        createdAt: '2024-01-01T00:00:00.000Z',
      }
      fsMock.seed(
        '/mock/appdata/projects/p1/project.json',
        JSON.stringify(project)
      )
      const result = listProjects()
      expect(result).toHaveLength(1)
      expect(result[0]).toEqual(project)
    })

    it('skips subdirectories without project.json', () => {
      fsMock.seedDir('/mock/appdata/projects/no-json')
      fsMock.seed('/mock/appdata/projects/no-json/other.txt', 'hello')
      const project = {
        id: 'valid',
        name: 'Valid',
        path: '/code',
        createdAt: '2024-01-01T00:00:00.000Z',
      }
      fsMock.seed(
        '/mock/appdata/projects/valid/project.json',
        JSON.stringify(project)
      )
      const result = listProjects()
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('valid')
    })

    it('skips non-directory entries', () => {
      fsMock.seed('/mock/appdata/projects/file.txt', 'not a dir')
      expect(listProjects()).toEqual([])
    })
  })

  describe('createProject', () => {
    it('generates UUID for new project', () => {
      const project = createProject('My Project', '/path/to/code')
      expect(project.id).toMatch(/^uuid-/)
    })

    it('creates project directory and writes project.json', () => {
      const project = createProject('My Project', '/path/to/code')
      const raw = fsMock.readRaw(`/mock/appdata/projects/${project.id}/project.json`)
      expect(raw).toBeDefined()
      const stored = JSON.parse(raw!)
      expect(stored.name).toBe('My Project')
      expect(stored.path).toBe('/path/to/code')
    })

    it('sets createdAt to ISO timestamp', () => {
      const project = createProject('Test', '/test')
      expect(project.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })
  })

  describe('deleteProject', () => {
    it('removes project directory recursively', () => {
      fsMock.seed(
        '/mock/appdata/projects/del1/project.json',
        JSON.stringify({ id: 'del1', name: 'Delete Me' })
      )
      deleteProject('del1')
      expect(fsMock.existsSync('/mock/appdata/projects/del1/project.json')).toBe(false)
    })

    it('is a no-op when project does not exist', () => {
      expect(() => deleteProject('nonexistent')).not.toThrow()
    })
  })

  describe('getProject', () => {
    it('returns project when it exists', () => {
      const project = {
        id: 'gp1',
        name: 'Get Me',
        path: '/code',
        createdAt: '2024-01-01T00:00:00.000Z',
      }
      fsMock.seed(
        '/mock/appdata/projects/gp1/project.json',
        JSON.stringify(project)
      )
      expect(getProject('gp1')).toEqual(project)
    })

    it('returns null when project does not exist', () => {
      expect(getProject('missing')).toBeNull()
    })
  })

  describe('updateProject', () => {
    it('updates specified fields and writes back', () => {
      const project = {
        id: 'up1',
        name: 'Old Name',
        path: '/old',
        createdAt: '2024-01-01T00:00:00.000Z',
      }
      fsMock.seed(
        '/mock/appdata/projects/up1/project.json',
        JSON.stringify(project)
      )
      const updated = updateProject('up1', { name: 'New Name', path: '/new' })
      expect(updated.name).toBe('New Name')
      expect(updated.path).toBe('/new')
    })

    it('preserves id and createdAt even if provided in data', () => {
      const project = {
        id: 'up2',
        name: 'Test',
        path: '/test',
        createdAt: '2024-01-01T00:00:00.000Z',
      }
      fsMock.seed(
        '/mock/appdata/projects/up2/project.json',
        JSON.stringify(project)
      )
      const updated = updateProject('up2', {
        id: 'SHOULD-NOT-CHANGE',
        createdAt: '9999-01-01T00:00:00.000Z',
        name: 'Updated',
      })
      expect(updated.id).toBe('up2')
      expect(updated.createdAt).toBe('2024-01-01T00:00:00.000Z')
    })

    it('throws when project not found', () => {
      expect(() => updateProject('missing', { name: 'X' })).toThrow(
        'Project not found: missing'
      )
    })
  })
})
