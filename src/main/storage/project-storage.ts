import { existsSync, readdirSync, rmSync } from 'fs'
import { join } from 'path'
import { v4 as uuid } from 'uuid'
import { getAppDataPath, ensureDir, readJson, writeJson } from './storage-manager'

export interface Project {
  id: string
  name: string
  path: string
  createdAt: string
}

/**
 * Returns the root directory for all project data: appData/projects/
 */
export function getProjectsDir(): string {
  return getAppDataPath('projects')
}

/**
 * Scans the projects directory and returns all valid projects.
 * Each project has its own subdirectory containing a project.json.
 */
export function listProjects(): Project[] {
  const dir = getProjectsDir()
  if (!existsSync(dir)) return []

  const entries = readdirSync(dir, { withFileTypes: true })
  const projects: Project[] = []

  for (const entry of entries) {
    if (!entry.isDirectory()) continue
    const projectFile = join(dir, entry.name, 'project.json')
    if (!existsSync(projectFile)) continue
    const project = readJson<Project | null>(projectFile, null)
    if (project) projects.push(project)
  }

  return projects
}

/**
 * Creates a new project with the given name and path.
 * Generates a UUID, creates the project directory, and initializes
 * project.json, sessions.json, and todos.json.
 */
export function createProject(name: string, path: string): Project {
  const id = uuid()
  const projectDir = join(getProjectsDir(), id)
  ensureDir(projectDir)

  const project: Project = {
    id,
    name,
    path,
    createdAt: new Date().toISOString(),
  }

  writeJson(join(projectDir, 'project.json'), project)
  writeJson(join(projectDir, 'sessions.json'), [])

  return project
}

/**
 * Deletes a project directory and all its data.
 */
export function deleteProject(projectId: string): void {
  const projectDir = join(getProjectsDir(), projectId)
  if (existsSync(projectDir)) {
    rmSync(projectDir, { recursive: true, force: true })
  }
}

/**
 * Returns a single project by ID, or null if not found.
 */
export function getProject(projectId: string): Project | null {
  const projectFile = join(getProjectsDir(), projectId, 'project.json')
  if (!existsSync(projectFile)) return null
  return readJson<Project | null>(projectFile, null)
}
