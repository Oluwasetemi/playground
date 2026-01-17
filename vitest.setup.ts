import '@testing-library/jest-dom/vitest'

// Mock WebContainer API for testing
vi.mock('@webcontainer/api', () => ({
  WebContainer: {
    boot: vi.fn().mockResolvedValue({
      mount: vi.fn().mockResolvedValue(undefined),
      fs: {
        readFile: vi.fn().mockResolvedValue(''),
        writeFile: vi.fn().mockResolvedValue(undefined),
        readdir: vi.fn().mockResolvedValue([]),
        rm: vi.fn().mockResolvedValue(undefined),
        mkdir: vi.fn().mockResolvedValue(undefined),
      },
      spawn: vi.fn().mockResolvedValue({
        exit: Promise.resolve(0),
        output: {
          pipeTo: vi.fn(),
        },
      }),
      on: vi.fn(),
      teardown: vi.fn(),
    }),
  },
}))

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
vi.stubGlobal('localStorage', localStorageMock)

// Mock requestIdleCallback
vi.stubGlobal('requestIdleCallback', (cb: () => void) => {
  return setTimeout(cb, 0)
})

vi.stubGlobal('cancelIdleCallback', (id: number) => {
  clearTimeout(id)
})
