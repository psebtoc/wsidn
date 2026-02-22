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

import { templateService } from './template-service'

const mockTemplate = {
  id: 'tmpl-1',
  title: 'My Template',
  content: 'Hello {{name}}',
  projectId: null,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
}

describe('template-service', () => {
  describe('list', () => {
    it('calls window.wsidn.template.list with null projectId for global templates', async () => {
      wsidnMock.template.list.mockResolvedValue({ success: true, data: [mockTemplate] })

      const result = await templateService.list(null)

      expect(wsidnMock.template.list).toHaveBeenCalledWith(null)
      expect(result).toEqual([mockTemplate])
    })

    it('calls window.wsidn.template.list with projectId for project templates', async () => {
      wsidnMock.template.list.mockResolvedValue({ success: true, data: [] })

      await templateService.list('proj-1')

      expect(wsidnMock.template.list).toHaveBeenCalledWith('proj-1')
    })

    it('throws on IpcResult failure', async () => {
      wsidnMock.template.list.mockResolvedValue({ success: false, error: 'list failed' })

      await expect(templateService.list(null)).rejects.toThrow('list failed')
    })
  })

  describe('create', () => {
    it('calls window.wsidn.template.create with input', async () => {
      wsidnMock.template.create.mockResolvedValue({ success: true, data: mockTemplate })

      const input = { title: 'My Template', content: 'Hello {{name}}', projectId: null }
      const result = await templateService.create(input)

      expect(wsidnMock.template.create).toHaveBeenCalledWith(input)
      expect(result).toEqual(mockTemplate)
    })

    it('throws on IpcResult failure', async () => {
      wsidnMock.template.create.mockResolvedValue({ success: false, error: 'create failed' })

      await expect(
        templateService.create({ title: 'X', content: '', projectId: null })
      ).rejects.toThrow('create failed')
    })
  })

  describe('update', () => {
    it('calls window.wsidn.template.update with input', async () => {
      const updated = { ...mockTemplate, title: 'Updated' }
      wsidnMock.template.update.mockResolvedValue({ success: true, data: updated })

      const input = { id: 'tmpl-1', title: 'Updated' }
      const result = await templateService.update(input)

      expect(wsidnMock.template.update).toHaveBeenCalledWith(input)
      expect(result).toEqual(updated)
    })

    it('throws on IpcResult failure', async () => {
      wsidnMock.template.update.mockResolvedValue({ success: false, error: 'update failed' })

      await expect(templateService.update({ id: 'tmpl-1', title: 'X' })).rejects.toThrow(
        'update failed'
      )
    })
  })

  describe('delete', () => {
    it('calls window.wsidn.template.delete with id', async () => {
      await templateService.delete('tmpl-1')

      expect(wsidnMock.template.delete).toHaveBeenCalledWith('tmpl-1')
    })

    it('throws on IpcResult failure', async () => {
      wsidnMock.template.delete.mockResolvedValue({ success: false, error: 'delete failed' })

      await expect(templateService.delete('tmpl-1')).rejects.toThrow('delete failed')
    })
  })
})
