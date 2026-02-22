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
    v4: vi.fn(() => `uuid-${++counter}`),
  }
})

import {
  listItems,
  createItem,
  updateItem,
  deleteItem,
  copyItems,
  replaceTasksAndDecisions,
} from './mindtree-storage'

const PROJECT_ID = 'proj-1'
const SESSION_ID = 'sess-1'
const MINDTREE_PATH = `/mock/appdata/projects/${PROJECT_ID}/mindtree/${SESSION_ID}.json`

describe('mindtree-storage', () => {
  beforeEach(() => {
    fsMock.reset()
  })

  describe('listItems', () => {
    it('returns empty array when file does not exist', () => {
      expect(listItems(PROJECT_ID, SESSION_ID)).toEqual([])
    })

    it('returns stored items', () => {
      const items = [
        {
          id: 't1',
          sessionId: SESSION_ID,
          category: 'task',
          title: 'Test',
          description: '',
          status: 'pending',
          priority: 'medium',
          parentId: null,
          order: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ]
      fsMock.seed(MINDTREE_PATH, JSON.stringify(items))
      expect(listItems(PROJECT_ID, SESSION_ID)).toHaveLength(1)
    })

    it('migrates items without category to task', () => {
      const items = [
        {
          id: 't1',
          sessionId: SESSION_ID,
          title: 'Old Item',
          description: '',
          status: 'pending',
          priority: 'medium',
          parentId: null,
          order: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ]
      fsMock.seed(MINDTREE_PATH, JSON.stringify(items))
      const result = listItems(PROJECT_ID, SESSION_ID)
      expect(result[0].category).toBe('task')
    })
  })

  describe('createItem', () => {
    it('creates item with default values', () => {
      const item = createItem({
        projectId: PROJECT_ID,
        sessionId: SESSION_ID,
        title: 'New Task',
      })
      expect(item.category).toBe('task')
      expect(item.priority).toBe('medium')
      expect(item.status).toBe('pending')
      expect(item.description).toBe('')
      expect(item.parentId).toBeNull()
    })

    it('uses provided category and priority', () => {
      const item = createItem({
        projectId: PROJECT_ID,
        sessionId: SESSION_ID,
        title: 'Decision',
        category: 'decision',
        priority: 'high',
      })
      expect(item.category).toBe('decision')
      expect(item.priority).toBe('high')
    })

    it('appends to existing items', () => {
      createItem({ projectId: PROJECT_ID, sessionId: SESSION_ID, title: 'First' })
      createItem({ projectId: PROJECT_ID, sessionId: SESSION_ID, title: 'Second' })
      const list = listItems(PROJECT_ID, SESSION_ID)
      expect(list).toHaveLength(2)
      expect(list[1].order).toBe(1)
    })

    it('sets parentId when provided', () => {
      const item = createItem({
        projectId: PROJECT_ID,
        sessionId: SESSION_ID,
        title: 'Child',
        parentId: 'parent-1',
      })
      expect(item.parentId).toBe('parent-1')
    })
  })

  describe('updateItem', () => {
    it('updates specified fields', () => {
      const item = createItem({
        projectId: PROJECT_ID,
        sessionId: SESSION_ID,
        title: 'Original',
      })
      const updated = updateItem({
        id: item.id,
        projectId: PROJECT_ID,
        sessionId: SESSION_ID,
        title: 'Updated Title',
        status: 'done',
      })
      expect(updated.title).toBe('Updated Title')
      expect(updated.status).toBe('done')
    })

    it('preserves unchanged fields', () => {
      const item = createItem({
        projectId: PROJECT_ID,
        sessionId: SESSION_ID,
        title: 'Keep Me',
        priority: 'high',
      })
      const updated = updateItem({
        id: item.id,
        projectId: PROJECT_ID,
        sessionId: SESSION_ID,
        status: 'in_progress',
      })
      expect(updated.title).toBe('Keep Me')
      expect(updated.priority).toBe('high')
    })

    it('throws when item not found', () => {
      expect(() =>
        updateItem({
          id: 'nonexistent',
          projectId: PROJECT_ID,
          sessionId: SESSION_ID,
          title: 'X',
        })
      ).toThrow('MindTreeItem not found: nonexistent')
    })
  })

  describe('deleteItem', () => {
    it('removes the specified item', () => {
      const item = createItem({
        projectId: PROJECT_ID,
        sessionId: SESSION_ID,
        title: 'Delete Me',
      })
      deleteItem(PROJECT_ID, SESSION_ID, item.id)
      expect(listItems(PROJECT_ID, SESSION_ID)).toHaveLength(0)
    })

    it('recursively deletes children', () => {
      const parent = createItem({
        projectId: PROJECT_ID,
        sessionId: SESSION_ID,
        title: 'Parent',
      })
      createItem({
        projectId: PROJECT_ID,
        sessionId: SESSION_ID,
        title: 'Child',
        parentId: parent.id,
      })
      createItem({
        projectId: PROJECT_ID,
        sessionId: SESSION_ID,
        title: 'Unrelated',
      })
      deleteItem(PROJECT_ID, SESSION_ID, parent.id)
      const remaining = listItems(PROJECT_ID, SESSION_ID)
      expect(remaining).toHaveLength(1)
      expect(remaining[0].title).toBe('Unrelated')
    })
  })

  describe('copyItems', () => {
    it('copies items to new session with updated sessionId', () => {
      createItem({ projectId: PROJECT_ID, sessionId: SESSION_ID, title: 'Copy Me' })
      copyItems(PROJECT_ID, SESSION_ID, 'sess-2')
      const copied = listItems(PROJECT_ID, 'sess-2')
      expect(copied).toHaveLength(1)
      expect(copied[0].sessionId).toBe('sess-2')
      expect(copied[0].title).toBe('Copy Me')
    })

    it('is a no-op when source has no items', () => {
      copyItems(PROJECT_ID, SESSION_ID, 'sess-2')
      expect(listItems(PROJECT_ID, 'sess-2')).toEqual([])
    })
  })

  describe('replaceTasksAndDecisions', () => {
    it('preserves notes and replaces tasks/decisions', () => {
      const items = [
        {
          id: 'note-1',
          sessionId: SESSION_ID,
          category: 'note',
          title: 'My Note',
          description: 'keep me',
          status: 'pending',
          priority: 'medium',
          parentId: null,
          order: 0,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
        {
          id: 'task-old',
          sessionId: SESSION_ID,
          category: 'task',
          title: 'Old Task',
          description: '',
          status: 'pending',
          priority: 'medium',
          parentId: null,
          order: 1,
          createdAt: '2024-01-01T00:00:00.000Z',
          updatedAt: '2024-01-01T00:00:00.000Z',
        },
      ]
      fsMock.seed(MINDTREE_PATH, JSON.stringify(items))

      const result = replaceTasksAndDecisions(
        PROJECT_ID,
        SESSION_ID,
        [{ title: 'New Task', status: 'in_progress' }],
        [{ title: 'New Decision' }]
      )
      const notes = result.filter((t) => t.category === 'note')
      const tasks = result.filter((t) => t.category === 'task')
      const decisions = result.filter((t) => t.category === 'decision')
      expect(notes).toHaveLength(1)
      expect(notes[0].title).toBe('My Note')
      expect(tasks).toHaveLength(1)
      expect(tasks[0].title).toBe('New Task')
      expect(tasks[0].status).toBe('in_progress')
      expect(decisions).toHaveLength(1)
      expect(decisions[0].title).toBe('New Decision')
    })

    it('maps valid statuses and defaults invalid to pending', () => {
      const result = replaceTasksAndDecisions(
        PROJECT_ID,
        SESSION_ID,
        [
          { title: 'Blocked', status: 'blocked' },
          { title: 'Done', status: 'done' },
          { title: 'Unknown', status: 'invalid' as any },
        ],
        []
      )
      expect(result[0].status).toBe('blocked')
      expect(result[1].status).toBe('done')
      expect(result[2].status).toBe('pending')
    })

    it('expands checklist items as children', () => {
      const result = replaceTasksAndDecisions(
        PROJECT_ID,
        SESSION_ID,
        [{ title: 'Parent Task', checklist: ['Step 1', 'Step 2'] }],
        []
      )
      expect(result).toHaveLength(3)
      const parent = result[0]
      const children = result.filter((t) => t.parentId === parent.id)
      expect(children).toHaveLength(2)
      expect(children[0].title).toBe('Step 1')
      expect(children[1].title).toBe('Step 2')
    })

    it('sets blockedReason as description', () => {
      const result = replaceTasksAndDecisions(
        PROJECT_ID,
        SESSION_ID,
        [{ title: 'Blocked Task', status: 'blocked', blockedReason: 'Waiting on API' }],
        []
      )
      expect(result[0].description).toBe('Waiting on API')
    })

    it('works with empty tasks and decisions', () => {
      const result = replaceTasksAndDecisions(PROJECT_ID, SESSION_ID, [], [])
      expect(result).toEqual([])
    })
  })
})
