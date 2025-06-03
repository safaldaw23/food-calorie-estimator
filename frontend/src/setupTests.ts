import '@testing-library/jest-dom'

// Mock environment variables
process.env.VITE_API_BASE_URL = 'http://localhost:9000'

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Mock fetch
global.fetch = jest.fn()

// Mock URL.createObjectURL
global.URL.createObjectURL = jest.fn(() => 'mocked-url')
global.URL.revokeObjectURL = jest.fn()

// Mock File and FileReader
global.FileReader = class {
  result: string | ArrayBuffer | null = null
  readAsDataURL = jest.fn(() => {
    this.result = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ...'
    if (this.onload) this.onload({} as ProgressEvent<FileReader>)
  })
  onload: ((this: FileReader, ev: ProgressEvent<FileReader>) => any) | null = null
} 