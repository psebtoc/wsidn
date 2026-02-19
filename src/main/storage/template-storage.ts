import { existsSync, readdirSync } from 'fs'
import { join } from 'path'
import { v4 as uuid } from 'uuid'
import { getAppDataPath, readJson, writeJson } from './storage-manager'

interface PromptTemplate {
  id: string
  title: string
  content: string
  scope: 'global' | 'project'
  projectId: string | null
  createdAt: string
  updatedAt: string
}

function globalTemplatesPath(): string {
  return getAppDataPath('templates.json')
}

function projectTemplatesPath(projectId: string): string {
  return getAppDataPath('projects', projectId, 'templates.json')
}

/**
 * Lists templates. If projectId is given, merges global + project templates.
 * If null, returns global only.
 */
export function listTemplates(projectId: string | null): PromptTemplate[] {
  const globalTemplates = readJson<PromptTemplate[]>(globalTemplatesPath(), [])
  if (!projectId) return globalTemplates

  const projectTemplates = readJson<PromptTemplate[]>(projectTemplatesPath(projectId), [])
  return [...globalTemplates, ...projectTemplates]
}

/**
 * Creates a new template. Writes to global file when scope='global',
 * project file when scope='project'.
 */
export function createTemplate(input: {
  title: string
  content: string
  scope: 'global' | 'project'
  projectId?: string | null
}): PromptTemplate {
  const now = new Date().toISOString()

  const template: PromptTemplate = {
    id: uuid(),
    title: input.title,
    content: input.content,
    scope: input.scope,
    projectId: input.scope === 'project' ? (input.projectId ?? null) : null,
    createdAt: now,
    updatedAt: now,
  }

  if (input.scope === 'global') {
    const templates = readJson<PromptTemplate[]>(globalTemplatesPath(), [])
    templates.push(template)
    writeJson(globalTemplatesPath(), templates)
  } else {
    if (!input.projectId) throw new Error('projectId is required for project-scoped templates')
    const templates = readJson<PromptTemplate[]>(projectTemplatesPath(input.projectId), [])
    templates.push(template)
    writeJson(projectTemplatesPath(input.projectId), templates)
  }

  return template
}

/**
 * Updates a template by id. Searches both global and all project files.
 */
export function updateTemplate(input: {
  id: string
  title?: string
  content?: string
}): PromptTemplate {
  // Try global first
  const globalPath = globalTemplatesPath()
  const globalTemplates = readJson<PromptTemplate[]>(globalPath, [])
  const globalIdx = globalTemplates.findIndex((t) => t.id === input.id)

  if (globalIdx !== -1) {
    const existing = globalTemplates[globalIdx]
    const updated: PromptTemplate = {
      ...existing,
      ...(input.title !== undefined && { title: input.title }),
      ...(input.content !== undefined && { content: input.content }),
      updatedAt: new Date().toISOString(),
    }
    globalTemplates[globalIdx] = updated
    writeJson(globalPath, globalTemplates)
    return updated
  }

  // Search project files
  const projectsDir = getAppDataPath('projects')
  if (existsSync(projectsDir)) {
    const entries = readdirSync(projectsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const projPath = projectTemplatesPath(entry.name)
      const templates = readJson<PromptTemplate[]>(projPath, [])
      const idx = templates.findIndex((t) => t.id === input.id)
      if (idx !== -1) {
        const existing = templates[idx]
        const updated: PromptTemplate = {
          ...existing,
          ...(input.title !== undefined && { title: input.title }),
          ...(input.content !== undefined && { content: input.content }),
          updatedAt: new Date().toISOString(),
        }
        templates[idx] = updated
        writeJson(projPath, templates)
        return updated
      }
    }
  }

  throw new Error(`Template not found: ${input.id}`)
}

/**
 * Deletes a template by id. Searches both global and all project files.
 */
export function deleteTemplate(id: string): void {
  // Try global first
  const globalPath = globalTemplatesPath()
  const globalTemplates = readJson<PromptTemplate[]>(globalPath, [])
  const globalIdx = globalTemplates.findIndex((t) => t.id === id)

  if (globalIdx !== -1) {
    globalTemplates.splice(globalIdx, 1)
    writeJson(globalPath, globalTemplates)
    return
  }

  // Search project files
  const projectsDir = getAppDataPath('projects')
  if (existsSync(projectsDir)) {
    const entries = readdirSync(projectsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const projPath = projectTemplatesPath(entry.name)
      const templates = readJson<PromptTemplate[]>(projPath, [])
      const idx = templates.findIndex((t) => t.id === id)
      if (idx !== -1) {
        templates.splice(idx, 1)
        writeJson(projPath, templates)
        return
      }
    }
  }

  throw new Error(`Template not found: ${id}`)
}
