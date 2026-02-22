import { describe, it, expect } from 'vitest'
import { unwrapIpc } from './ipc'
import type { IpcResult } from './ipc'

describe('unwrapIpc', () => {
  it('returns data on success', () => {
    const result: IpcResult<string> = { success: true, data: 'hello' }
    expect(unwrapIpc(result)).toBe('hello')
  })

  it('throws Error with message on failure', () => {
    const result: IpcResult<string> = { success: false, error: 'something went wrong' }
    expect(() => unwrapIpc(result)).toThrow('something went wrong')
  })

  it('works with various data types', () => {
    expect(unwrapIpc({ success: true, data: [1, 2, 3] })).toEqual([1, 2, 3])
    expect(unwrapIpc({ success: true, data: { key: 'val' } })).toEqual({ key: 'val' })
    expect(unwrapIpc({ success: true, data: null })).toBeNull()
  })
})
