import { describe, it, expect, vi, beforeEach } from 'vitest'
import { createWsidnMock } from '../../../test/mocks/wsidn-api'

const wsidnMock = createWsidnMock()
// Set up window.wsidn at module level (compatible with both Node and jsdom)
Object.defineProperty(globalThis, 'window', {
  value: { ...(globalThis as Record<string, unknown>)['window'], wsidn: wsidnMock },
  writable: true,
  configurable: true,
})

beforeEach(() => {
  wsidnMock.reset()
})

import { mindtreeService } from './mindtree-service'

const PROJECT_ID = 'proj-1'
const SESSION_ID = 'sess-1'

const mockItem = {
  id: 'item-1',
  sessionId: SESSION_ID,
  category: 'task' as const,
  title: 'Test Item',
  description: '',
  status: 'pending' as const,
  priority: 'medium' as const,
  parentId: null,
  order: 0,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

describe('mindtree-service', () => {
  describe('list', () => {
    it('calls window.wsidn.mindtree.list with projectId and sessionId', async () => {
      wsidnMock.mindtree.list.mockResolvedValue({ success: true, data: [mockItem] })

      const result = await mindtreeService.list(PROJECT_ID, SESSION_ID)

      expect(wsidnMock.mindtree.list).toHaveBeenCalledWith(PROJECT_ID, SESSION_ID)
      expect(result).toEqual([mockItem])
    })

    it('throws on IpcResult failure', async () => {
      wsidnMock.mindtree.list.mockResolvedValue({ success: false, error: 'list failed' })

      await expect(mindtreeService.list(PROJECT_ID, SESSION_ID)).rejects.toThrow('list failed')
    })
  })

  describe('create', () => {
    it('calls window.wsidn.mindtree.create with input', async () => {
      wsidnMock.mindtree.create.mockResolvedValue({ success: true, data: mockItem })

      const input = { projectId: PROJECT_ID, sessionId: SESSION_ID, title: 'New Item' }
      const result = await mindtreeService.create(input)

      expect(wsidnMock.mindtree.create).toHaveBeenCalledWith(input)
      expect(result).toEqual(mockItem)
    })

    it('throws on IpcResult failure', async () => {
      wsidnMock.mindtree.create.mockResolvedValue({ success: false, error: 'create failed' })

      await expect(
        mindtreeService.create({ projectId: PROJECT_ID, sessionId: SESSION_ID, title: 'X' })
      ).rejects.toThrow('create failed')
    })
  })

  describe('update', () => {
    it('calls window.wsidn.mindtree.update with input', async () => {
      const updated = { ...mockItem, title: 'Updated' }
      wsidnMock.mindtree.update.mockResolvedValue({ success: true, data: updated })

      const input = { id: 'item-1', projectId: PROJECT_ID, sessionId: SESSION_ID, title: 'Updated' }
      const result = await mindtreeService.update(input)

      expect(wsidnMock.mindtree.update).toHaveBeenCalledWith(input)
      expect(result).toEqual(updated)
    })

    it('throws on IpcResult failure', async () => {
      wsidnMock.mindtree.update.mockResolvedValue({ success: false, error: 'update failed' })

      await expect(
        mindtreeService.update({ id: 'item-1', projectId: PROJECT_ID, sessionId: SESSION_ID })
      ).rejects.toThrow('update failed')
    })
  })

  describe('delete', () => {
    it('calls window.wsidn.mindtree.delete with ids', async () => {
      await mindtreeService.delete(PROJECT_ID, SESSION_ID, 'item-1')

      expect(wsidnMock.mindtree.delete).toHaveBeenCalledWith(PROJECT_ID, SESSION_ID, 'item-1')
    })

    it('throws on IpcResult failure', async () => {
      wsidnMock.mindtree.delete.mockResolvedValue({ success: false, error: 'delete failed' })

      await expect(mindtreeService.delete(PROJECT_ID, SESSION_ID, 'item-1')).rejects.toThrow(
        'delete failed'
      )
    })
  })

  describe('copy', () => {
    it('calls window.wsidn.mindtree.copy with project and session ids', async () => {
      await mindtreeService.copy(PROJECT_ID, 'sess-from', 'sess-to')

      expect(wsidnMock.mindtree.copy).toHaveBeenCalledWith(PROJECT_ID, 'sess-from', 'sess-to')
    })

    it('throws on IpcResult failure', async () => {
      wsidnMock.mindtree.copy.mockResolvedValue({ success: false, error: 'copy failed' })

      await expect(mindtreeService.copy(PROJECT_ID, 'sess-from', 'sess-to')).rejects.toThrow(
        'copy failed'
      )
    })
  })
})
