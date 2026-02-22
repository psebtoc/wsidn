import { vi } from 'vitest'

/**
 * In-memory filesystem mock for testing storage layer.
 * Supports: existsSync, readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync
 */
export function createFsMemory() {
  // file store: path → content string
  const files = new Map<string, string>()
  // directory store: set of known directories
  const dirs = new Set<string>()

  function normalizePath(p: string): string {
    return p.replace(/\\/g, '/')
  }

  function addParentDirs(filePath: string): void {
    const parts = normalizePath(filePath).split('/')
    for (let i = 1; i < parts.length; i++) {
      dirs.add(parts.slice(0, i).join('/'))
    }
  }

  const mock = {
    existsSync: vi.fn((p: string) => {
      const np = normalizePath(p)
      return files.has(np) || dirs.has(np)
    }),

    readFileSync: vi.fn((p: string, _encoding?: string) => {
      const np = normalizePath(p)
      const content = files.get(np)
      if (content === undefined) {
        throw new Error(`ENOENT: no such file or directory, open '${p}'`)
      }
      return content
    }),

    writeFileSync: vi.fn((p: string, data: string, _encoding?: string) => {
      const np = normalizePath(p)
      files.set(np, data)
      addParentDirs(np)
    }),

    mkdirSync: vi.fn((p: string, _options?: { recursive?: boolean }) => {
      const np = normalizePath(p)
      dirs.add(np)
      addParentDirs(np)
    }),

    readdirSync: vi.fn((p: string, options?: { withFileTypes?: boolean }) => {
      const np = normalizePath(p)
      const prefix = np.endsWith('/') ? np : np + '/'
      const entries = new Map<string, 'file' | 'dir'>()

      // Find direct children (files)
      for (const filePath of files.keys()) {
        if (filePath.startsWith(prefix)) {
          const rest = filePath.slice(prefix.length)
          const name = rest.split('/')[0]
          if (name && !rest.includes('/')) {
            entries.set(name, 'file')
          } else if (name) {
            entries.set(name, 'dir')
          }
        }
      }

      // Find direct children (dirs)
      for (const dirPath of dirs) {
        if (dirPath.startsWith(prefix)) {
          const rest = dirPath.slice(prefix.length)
          const name = rest.split('/')[0]
          if (name && !rest.slice(name.length).includes('/')) {
            entries.set(name, 'dir')
          }
        }
      }

      if (options?.withFileTypes) {
        return [...entries.entries()].map(([name, type]) => ({
          name,
          isDirectory: () => type === 'dir',
          isFile: () => type === 'file',
        }))
      }

      return [...entries.keys()]
    }),

    rmSync: vi.fn((p: string, _options?: { recursive?: boolean; force?: boolean }) => {
      const np = normalizePath(p)
      // Remove exact file
      files.delete(np)
      dirs.delete(np)
      // Remove all children
      const prefix = np + '/'
      for (const key of files.keys()) {
        if (key.startsWith(prefix)) files.delete(key)
      }
      for (const key of dirs) {
        if (key.startsWith(prefix)) dirs.delete(key)
      }
    }),

    // --- Helpers (not part of fs API) ---

    /** Reset in-memory state */
    reset: () => {
      files.clear()
      dirs.clear()
      vi.clearAllMocks()
    },

    /** Seed a file with content */
    seed: (p: string, content: string) => {
      const np = normalizePath(p)
      files.set(np, content)
      addParentDirs(np)
    },

    /** Seed a directory */
    seedDir: (p: string) => {
      const np = normalizePath(p)
      dirs.add(np)
      addParentDirs(np)
    },

    /** Get raw file content (for assertions) */
    readRaw: (p: string): string | undefined => {
      return files.get(normalizePath(p))
    },
  }

  return mock
}

export type FsMemory = ReturnType<typeof createFsMemory>
