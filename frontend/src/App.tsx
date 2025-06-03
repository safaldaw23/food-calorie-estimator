import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import { Box, CircularProgress } from '@mui/material'
import { Suspense, lazy } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ErrorProvider } from './context/ErrorContext'
import Navbar from './components/Navbar'
import Login from './components/Login'

// Lazy load components
const Home = lazy(() => import('./pages/Home'))
const Analyze = lazy(() => import('./pages/Analyze'))
const History = lazy(() => import('./pages/History'))
const Dashboard = lazy(() => import('./pages/Dashboard'))
const BatchAnalyze = lazy(() => import('./pages/BatchAnalyze'))
const ServerError = lazy(() => import('./pages/ServerError'))

// Loading component
const LoadingFallback = () => (
  <Box 
    sx={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '50vh' 
    }}
  >
    <CircularProgress />
  </Box>
)

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2196f3',
    },
    secondary: {
      main: '#f50057',
    },
  },
})

// Main app content that requires authentication context
const AppContent = () => {
  const { isAuthenticated, isAdmin } = useAuth()

  // Show login if not authenticated
  if (!isAuthenticated) {
    return <Login />
  }

  return (
    <ErrorProvider>
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
          width: '100%',
        }}
      >
        <Navbar />
        <Box
          sx={{
            flex: 1,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            p: { xs: 2, sm: 3, md: 4 },
            overflow: 'auto',
          }}
        >
          <Suspense fallback={<LoadingFallback />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/analyze" element={<Analyze />} />
              <Route path="/batch-analyze" element={<BatchAnalyze />} />
              <Route path="/history" element={<History />} />
              {/* Admin-only routes */}
              {isAdmin && (
                <Route path="/dashboard" element={<Dashboard />} />
              )}
              {/* Error pages */}
              <Route path="/server-error" element={<ServerError />} />
              {/* Catch all route */}
              <Route path="*" element={<Home />} />
            </Routes>
          </Suspense>
        </Box>
      </Box>
    </ErrorProvider>
  )
}

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <AppContent />
        </Router>
      </AuthProvider>
    </ThemeProvider>
  )
}

export default App
