import { app } from 'electron'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { join, dirname } from 'path'

/**
 * Returns an absolute path under the app's userData directory (%APPDATA%/wsidn/).
 */
export function getAppDataPath(...segments: string[]): string {
  return join(app.getPath('userData'), ...segments)
}

/**
 * Ensures the given directory exists, creating it recursively if needed.
 */
export function ensureDir(dirPath: string): void {
  mkdirSync(dirPath, { recursive: true })
}

/**
 * Reads and parses a JSON file. Returns defaultValue if the file does not exist.
 */
export function readJson<T>(filePath: string, defaultValue: T): T {
  if (!existsSync(filePath)) return defaultValue
  const raw = readFileSync(filePath, 'utf-8')
  return JSON.parse(raw) as T
}

/**
 * Writes data as pretty-printed JSON to the given file path.
 * Creates parent directories if they don't exist.
 */
export function writeJson(filePath: string, data: unknown): void {
  ensureDir(dirname(filePath))
  writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8')
}
