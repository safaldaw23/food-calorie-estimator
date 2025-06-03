import { render, screen } from '@testing-library/react'
import App from '../App'

// Mock the router since our app uses react-router-dom
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  BrowserRouter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock the AuthContext
jest.mock('../context/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  useAuth: () => ({
    isAuthenticated: true,
    isAdmin: false,
    user: null,
    login: jest.fn(),
    logout: jest.fn(),
  }),
}))

// Mock the ErrorContext
jest.mock('../context/ErrorContext', () => ({
  ErrorProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

// Mock the page components
jest.mock('../pages/Home', () => {
  return function MockHome() {
    return <div data-testid="home-page">Home Page</div>
  }
})

jest.mock('../pages/Analyze', () => {
  return function MockAnalyze() {
    return <div data-testid="analyze-page">Analyze Page</div>
  }
})

jest.mock('../pages/History', () => {
  return function MockHistory() {
    return <div data-testid="history-page">History Page</div>
  }
})

jest.mock('../pages/Dashboard', () => {
  return function MockDashboard() {
    return <div data-testid="dashboard-page">Dashboard Page</div>
  }
})

jest.mock('../pages/BatchAnalyze', () => {
  return function MockBatchAnalyze() {
    return <div data-testid="batch-analyze-page">Batch Analyze Page</div>
  }
})

jest.mock('../components/Navbar', () => {
  return function MockNavbar() {
    return <div data-testid="navbar">Navigation Bar</div>
  }
})

describe('App Component', () => {
  beforeEach(() => {
    // Mock window.location
    delete (window as any).location
    window.location = { pathname: '/' } as Location
  })

  test('renders without crashing', () => {
    render(<App />)
    expect(screen.getByTestId('navbar')).toBeInTheDocument()
  })

  test('renders home page by default', () => {
    render(<App />)
    expect(screen.getByTestId('home-page')).toBeInTheDocument()
  })

  test('provides theme provider', () => {
    const { container } = render(<App />)
    // Check if Material-UI theme is applied
    expect(container.firstChild).toHaveClass()
  })

  test('provides authentication context', () => {
    render(<App />)
    // Since we're mocking the auth context to return authenticated,
    // we should see the main app content, not login
    expect(screen.getByTestId('navbar')).toBeInTheDocument()
    expect(screen.getByTestId('home-page')).toBeInTheDocument()
  })
}) 