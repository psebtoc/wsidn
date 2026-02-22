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

vi.mock('uuid', () => {
  let counter = 0
  return {
    v4: vi.fn(() => `tmpl-uuid-${++counter}`),
  }
})

import {
  listTemplates,
  createTemplate,
  updateTemplate,
  deleteTemplate,
} from './template-storage'

const GLOBAL_PATH = '/mock/appdata/templates.json'
const PROJECT_ID = 'proj-1'
const PROJECT_PATH = `/mock/appdata/projects/${PROJECT_ID}/templates.json`

function makeGlobalTemplate(id: string, title: string) {
  return {
    id,
    title,
    content: `Content of ${title}`,
    scope: 'global' as const,
    projectId: null,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }
}

function makeProjectTemplate(id: string, title: string, projectId: string) {
  return {
    id,
    title,
    content: `Content of ${title}`,
    scope: 'project' as const,
    projectId,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  }
}

describe('template-storage', () => {
  beforeEach(() => {
    fsMock.reset()
  })

  describe('listTemplates', () => {
    it('returns only global templates when projectId is null', () => {
      fsMock.seed(GLOBAL_PATH, JSON.stringify([makeGlobalTemplate('g1', 'Global')]))
      fsMock.seed(PROJECT_PATH, JSON.stringify([makeProjectTemplate('p1', 'Project', PROJECT_ID)]))
      const result = listTemplates(null)
      expect(result).toHaveLength(1)
      expect(result[0].id).toBe('g1')
    })

    it('merges global and project templates when projectId is given', () => {
      fsMock.seed(GLOBAL_PATH, JSON.stringify([makeGlobalTemplate('g1', 'Global')]))
      fsMock.seed(PROJECT_PATH, JSON.stringify([makeProjectTemplate('p1', 'Project', PROJECT_ID)]))
      const result = listTemplates(PROJECT_ID)
      expect(result).toHaveLength(2)
    })

    it('returns empty array when no templates exist', () => {
      expect(listTemplates(null)).toEqual([])
    })

    it('returns only global templates when project has no templates file', () => {
      fsMock.seed(GLOBAL_PATH, JSON.stringify([makeGlobalTemplate('g1', 'Global')]))
      const result = listTemplates(PROJECT_ID)
      expect(result).toHaveLength(1)
      expect(result[0].scope).toBe('global')
    })
  })

  describe('createTemplate', () => {
    it('creates a global template', () => {
      const tmpl = createTemplate({
        title: 'My Global',
        content: 'Hello',
        scope: 'global',
      })
      expect(tmpl.scope).toBe('global')
      expect(tmpl.projectId).toBeNull()
      const stored = JSON.parse(fsMock.readRaw(GLOBAL_PATH)!)
      expect(stored).toHaveLength(1)
      expect(stored[0].title).toBe('My Global')
    })

    it('creates a project-scoped template', () => {
      const tmpl = createTemplate({
        title: 'My Project Tmpl',
        content: 'World',
        scope: 'project',
        projectId: PROJECT_ID,
      })
      expect(tmpl.scope).toBe('project')
      expect(tmpl.projectId).toBe(PROJECT_ID)
      const stored = JSON.parse(fsMock.readRaw(PROJECT_PATH)!)
      expect(stored).toHaveLength(1)
    })

    it('throws when creating project template without projectId', () => {
      expect(() =>
        createTemplate({
          title: 'Fail',
          content: 'X',
          scope: 'project',
        })
      ).toThrow('projectId is required for project-scoped templates')
    })

    it('appends to existing templates', () => {
      fsMock.seed(GLOBAL_PATH, JSON.stringify([makeGlobalTemplate('existing', 'Existing')]))
      createTemplate({ title: 'New', content: 'new', scope: 'global' })
      const stored = JSON.parse(fsMock.readRaw(GLOBAL_PATH)!)
      expect(stored).toHaveLength(2)
    })
  })

  describe('updateTemplate', () => {
    it('updates a global template', () => {
      fsMock.seed(GLOBAL_PATH, JSON.stringify([makeGlobalTemplate('g1', 'Original')]))
      const updated = updateTemplate({ id: 'g1', title: 'Updated' })
      expect(updated.title).toBe('Updated')
      expect(updated.content).toBe('Content of Original') // unchanged
    })

    it('updates a project template when not found in global', () => {
      fsMock.seed(GLOBAL_PATH, JSON.stringify([]))
      fsMock.seed(
        PROJECT_PATH,
        JSON.stringify([makeProjectTemplate('p1', 'Proj Original', PROJECT_ID)])
      )
      // Need to ensure project dir is discoverable via readdirSync
      fsMock.seedDir(`/mock/appdata/projects/${PROJECT_ID}`)
      const updated = updateTemplate({ id: 'p1', content: 'New Content' })
      expect(updated.content).toBe('New Content')
      expect(updated.title).toBe('Proj Original') // unchanged
    })

    it('throws when template not found anywhere', () => {
      fsMock.seed(GLOBAL_PATH, JSON.stringify([]))
      expect(() => updateTemplate({ id: 'nonexistent', title: 'X' })).toThrow(
        'Template not found: nonexistent'
      )
    })

    it('updates updatedAt timestamp', () => {
      fsMock.seed(GLOBAL_PATH, JSON.stringify([makeGlobalTemplate('g1', 'Test')]))
      const updated = updateTemplate({ id: 'g1', title: 'Changed' })
      expect(updated.updatedAt).not.toBe('2024-01-01T00:00:00.000Z')
    })
  })

  describe('deleteTemplate', () => {
    it('deletes a global template', () => {
      fsMock.seed(
        GLOBAL_PATH,
        JSON.stringify([makeGlobalTemplate('g1', 'A'), makeGlobalTemplate('g2', 'B')])
      )
      deleteTemplate('g1')
      const stored = JSON.parse(fsMock.readRaw(GLOBAL_PATH)!)
      expect(stored).toHaveLength(1)
      expect(stored[0].id).toBe('g2')
    })

    it('deletes a project template when not found in global', () => {
      fsMock.seed(GLOBAL_PATH, JSON.stringify([]))
      fsMock.seed(
        PROJECT_PATH,
        JSON.stringify([makeProjectTemplate('p1', 'Delete Me', PROJECT_ID)])
      )
      fsMock.seedDir(`/mock/appdata/projects/${PROJECT_ID}`)
      deleteTemplate('p1')
      const stored = JSON.parse(fsMock.readRaw(PROJECT_PATH)!)
      expect(stored).toHaveLength(0)
    })

    it('throws when template not found anywhere', () => {
      fsMock.seed(GLOBAL_PATH, JSON.stringify([]))
      expect(() => deleteTemplate('nonexistent')).toThrow(
        'Template not found: nonexistent'
      )
    })
  })
})
