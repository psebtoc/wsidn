import { create } from 'zustand'
import { projectService } from '@renderer/services/project-service'
import type { Project } from '@renderer/types/project'

interface ProjectState {
  projects: Project[]
  activeProjectId: string | null
  loading: boolean
  // actions
  loadProjects: () => Promise<void>
  createProject: (name: string, path: string) => Promise<Project>
  deleteProject: (projectId: string) => Promise<void>
  updateProject: (projectId: string, data: Record<string, unknown>) => Promise<void>
  setActiveProject: (projectId: string) => void
  clearActiveProject: () => void
}

export const useProjectStore = create<ProjectState>((set) => ({
  projects: [],
  activeProjectId: null,
  loading: false,

  loadProjects: async () => {
    set({ loading: true })
    const projects = await projectService.list()
    set({ projects, loading: false })
  },

  createProject: async (name, path) => {
    const project = await projectService.create(name, path)
    set((s) => ({ projects: [...s.projects, project] }))
    return project
  },

  deleteProject: async (projectId) => {
    await projectService.delete(projectId)
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== projectId),
      activeProjectId: s.activeProjectId === projectId ? null : s.activeProjectId,
    }))
  },

  updateProject: async (projectId, data) => {
    const updated = await projectService.update(projectId, data)
    set((s) => ({
      projects: s.projects.map((p) => (p.id === projectId ? updated : p)),
    }))
  },

  setActiveProject: (projectId) => set({ activeProjectId: projectId }),
  clearActiveProject: () => set({ activeProjectId: null }),
}))
