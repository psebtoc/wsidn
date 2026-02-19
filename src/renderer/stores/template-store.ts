import { create } from 'zustand'
import { templateService } from '@renderer/services/template-service'
import type { PromptTemplate, CreateTemplateInput, UpdateTemplateInput } from '@renderer/types/project'

interface TemplateState {
  templates: PromptTemplate[]
  editingId: string | null
  // actions
  loadTemplates: (projectId: string | null) => Promise<void>
  addTemplate: (input: CreateTemplateInput) => Promise<PromptTemplate>
  updateTemplate: (input: UpdateTemplateInput) => Promise<PromptTemplate>
  removeTemplate: (id: string) => Promise<void>
  setEditing: (id: string | null) => void
}

export const useTemplateStore = create<TemplateState>((set) => ({
  templates: [],
  editingId: null,

  loadTemplates: async (projectId) => {
    const templates = await templateService.list(projectId)
    set({ templates })
  },

  addTemplate: async (input) => {
    const template = await templateService.create(input)
    set((s) => ({ templates: [...s.templates, template] }))
    return template
  },

  updateTemplate: async (input) => {
    const template = await templateService.update(input)
    set((s) => ({
      templates: s.templates.map((t) => (t.id === template.id ? template : t)),
    }))
    return template
  },

  removeTemplate: async (id) => {
    await templateService.delete(id)
    set((s) => ({
      templates: s.templates.filter((t) => t.id !== id),
      editingId: s.editingId === id ? null : s.editingId,
    }))
  },

  setEditing: (id) => set({ editingId: id }),
}))
