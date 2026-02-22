import { vi } from 'vitest'

let _userDataPath = '/mock/appdata/wsidn'

export function setUserDataPath(p: string): void {
  _userDataPath = p
}

export const electronMock = {
  app: {
    getPath: vi.fn((name: string) => {
      if (name === 'userData') return _userDataPath
      return `/mock/${name}`
    }),
  },
}

/**
 * Call this in your test file to register the electron mock:
 * vi.mock('electron', () => electronMock)
 */
export function createElectronMock() {
  return electronMock
}
