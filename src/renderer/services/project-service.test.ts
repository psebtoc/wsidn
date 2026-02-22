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

import { projectService } from './project-service'

describe('project-service', () => {
  describe('list', () => {
    it('calls window.wsidn.project.list and returns data', async () => {
      const projects = [{ id: 'p1', name: 'Test', path: '/test', createdAt: '2024-01-01T00:00:00.000Z' }]
      wsidnMock.project.list.mockResolvedValue({ success: true, data: projects })

      const result = await projectService.list()

      expect(wsidnMock.project.list).toHaveBeenCalledOnce()
      expect(result).toEqual(projects)
    })

    it('throws on IpcResult failure', async () => {
      wsidnMock.project.list.mockResolvedValue({ success: false, error: 'DB error' })

      await expect(projectService.list()).rejects.toThrow('DB error')
    })
  })

  describe('create', () => {
    it('calls window.wsidn.project.create with name and path', async () => {
      const project = { id: 'p1', name: 'New', path: '/new', createdAt: '2024-01-01T00:00:00.000Z' }
      wsidnMock.project.create.mockResolvedValue({ success: true, data: project })

      const result = await projectService.create('New', '/new')

      expect(wsidnMock.project.create).toHaveBeenCalledWith('New', '/new')
      expect(result).toEqual(project)
    })

    it('throws on IpcResult failure', async () => {
      wsidnMock.project.create.mockResolvedValue({ success: false, error: 'create failed' })

      await expect(projectService.create('X', '/x')).rejects.toThrow('create failed')
    })
  })

  describe('delete', () => {
    it('calls window.wsidn.project.delete with projectId', async () => {
      await projectService.delete('p1')

      expect(wsidnMock.project.delete).toHaveBeenCalledWith('p1')
    })

    it('throws on IpcResult failure', async () => {
      wsidnMock.project.delete.mockResolvedValue({ success: false, error: 'delete failed' })

      await expect(projectService.delete('p1')).rejects.toThrow('delete failed')
    })
  })

  describe('update', () => {
    it('calls window.wsidn.project.update with id and data', async () => {
      const updated = { id: 'p1', name: 'Updated', path: '/new', createdAt: '2024-01-01T00:00:00.000Z' }
      wsidnMock.project.update.mockResolvedValue({ success: true, data: updated })

      const result = await projectService.update('p1', { name: 'Updated' })

      expect(wsidnMock.project.update).toHaveBeenCalledWith('p1', { name: 'Updated' })
      expect(result).toEqual(updated)
    })

    it('throws on IpcResult failure', async () => {
      wsidnMock.project.update.mockResolvedValue({ success: false, error: 'update failed' })

      await expect(projectService.update('p1', {})).rejects.toThrow('update failed')
    })
  })

  describe('selectDir', () => {
    it('calls window.wsidn.project.selectDir and returns path', async () => {
      wsidnMock.project.selectDir.mockResolvedValue({ success: true, data: '/selected/dir' })

      const result = await projectService.selectDir()

      expect(wsidnMock.project.selectDir).toHaveBeenCalledOnce()
      expect(result).toBe('/selected/dir')
    })

    it('returns null when user cancels dialog', async () => {
      wsidnMock.project.selectDir.mockResolvedValue({ success: true, data: null })

      const result = await projectService.selectDir()

      expect(result).toBeNull()
    })

    it('throws on IpcResult failure', async () => {
      wsidnMock.project.selectDir.mockResolvedValue({ success: false, error: 'dialog error' })

      await expect(projectService.selectDir()).rejects.toThrow('dialog error')
    })
  })
})
