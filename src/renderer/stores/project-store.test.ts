import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@renderer/services/project-service', () => ({
  projectService: {
    list: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
    update: vi.fn(),
  },
}))

import { useProjectStore } from './project-store'
import { projectService } from '@renderer/services/project-service'
import type { Project } from '@renderer/types/project'

const mockProject = (id: string, name = `Project ${id}`): Project => ({
  id,
  name,
  path: `/path/${id}`,
  createdAt: '2025-01-01T00:00:00.000Z',
})

beforeEach(() => {
  useProjectStore.setState({
    projects: [],
    activeProjectId: null,
    loading: false,
  })
  vi.clearAllMocks()
})

describe('project-store', () => {
  describe('loadProjects', () => {
    it('sets loading true then populates projects and sets loading false', async () => {
      const list = [mockProject('p1'), mockProject('p2')]
      vi.mocked(projectService.list).mockResolvedValue(list)

      const promise = useProjectStore.getState().loadProjects()
      // loading should be true synchronously after call
      expect(useProjectStore.getState().loading).toBe(true)

      await promise
      expect(projectService.list).toHaveBeenCalledOnce()
      expect(useProjectStore.getState().projects).toEqual(list)
      expect(useProjectStore.getState().loading).toBe(false)
    })
  })

  describe('createProject', () => {
    it('calls service.create and adds project to the array', async () => {
      const existing = mockProject('p1')
      useProjectStore.setState({ projects: [existing] })

      const newProject = mockProject('p2', 'New Project')
      vi.mocked(projectService.create).mockResolvedValue(newProject)

      const result = await useProjectStore.getState().createProject('New Project', '/path/p2')

      expect(projectService.create).toHaveBeenCalledWith('New Project', '/path/p2')
      expect(result).toEqual(newProject)
      expect(useProjectStore.getState().projects).toEqual([existing, newProject])
    })
  })

  describe('deleteProject', () => {
    it('removes project from array and clears activeProjectId if matching', async () => {
      const p1 = mockProject('p1')
      const p2 = mockProject('p2')
      useProjectStore.setState({ projects: [p1, p2], activeProjectId: 'p1' })
      vi.mocked(projectService.delete).mockResolvedValue(undefined as never)

      await useProjectStore.getState().deleteProject('p1')

      expect(projectService.delete).toHaveBeenCalledWith('p1')
      expect(useProjectStore.getState().projects).toEqual([p2])
      expect(useProjectStore.getState().activeProjectId).toBeNull()
    })

    it('does not clear activeProjectId if deleting a different project', async () => {
      const p1 = mockProject('p1')
      const p2 = mockProject('p2')
      useProjectStore.setState({ projects: [p1, p2], activeProjectId: 'p1' })
      vi.mocked(projectService.delete).mockResolvedValue(undefined as never)

      await useProjectStore.getState().deleteProject('p2')

      expect(useProjectStore.getState().projects).toEqual([p1])
      expect(useProjectStore.getState().activeProjectId).toBe('p1')
    })
  })

  describe('updateProject', () => {
    it('calls service.update and replaces the project in the array', async () => {
      const p1 = mockProject('p1', 'Old Name')
      const p2 = mockProject('p2')
      useProjectStore.setState({ projects: [p1, p2] })

      const updated = { ...p1, name: 'New Name' }
      vi.mocked(projectService.update).mockResolvedValue(updated)

      await useProjectStore.getState().updateProject('p1', { name: 'New Name' })

      expect(projectService.update).toHaveBeenCalledWith('p1', { name: 'New Name' })
      expect(useProjectStore.getState().projects[0].name).toBe('New Name')
      expect(useProjectStore.getState().projects[1]).toEqual(p2)
    })
  })

  describe('setActiveProject', () => {
    it('sets activeProjectId', () => {
      useProjectStore.getState().setActiveProject('p1')
      expect(useProjectStore.getState().activeProjectId).toBe('p1')
    })
  })

  describe('clearActiveProject', () => {
    it('sets activeProjectId to null', () => {
      useProjectStore.setState({ activeProjectId: 'p1' })
      useProjectStore.getState().clearActiveProject()
      expect(useProjectStore.getState().activeProjectId).toBeNull()
    })
  })
})
