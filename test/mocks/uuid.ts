import { vi } from 'vitest'

/**
 * Creates a sequential UUID mock.
 * Returns 'uuid-1', 'uuid-2', etc.
 */
export function createUuidMock() {
  let counter = 0

  const v4 = vi.fn(() => {
    counter++
    return `uuid-${counter}`
  })

  return {
    v4,
    reset: () => {
      counter = 0
      v4.mockClear()
    },
  }
}
