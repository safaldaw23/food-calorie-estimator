import React, { useState, useEffect } from 'react'
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  Stack,
  Divider,
  CircularProgress
} from '@mui/material'
import {
  Error as ErrorIcon,
  Refresh as RefreshIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as CancelIcon
} from '@mui/icons-material'
import { useNavigate, useLocation } from 'react-router-dom'
import { checkLoadBalancerHealth } from '../config/api'
import { useError } from '../context/ErrorContext'

interface ServerErrorProps {
  error?: string
  serverUrl?: string
  onRetry?: () => void
}

const ServerError: React.FC<ServerErrorProps> = ({ 
  error: propError, 
  serverUrl: propServerUrl,
  onRetry 
}) => {
  const [loading, setLoading] = useState(false)
  const [serverStatus, setServerStatus] = useState<any>(null)
  const [isCheckingHealth, setIsCheckingHealth] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { clearError } = useError()

  // Get error details from navigation state or props
  const error = location.state?.error || propError || 'Backend server is currently unavailable'
  const serverUrl = location.state?.serverUrl || propServerUrl

  const checkServerHealth = async () => {
    setIsCheckingHealth(true)
    try {
      const health = await checkLoadBalancerHealth()
      setServerStatus(health)
    } catch (err) {
      console.error('Health check failed:', err)
      setServerStatus(null)
    } finally {
      setIsCheckingHealth(false)
    }
  }

  useEffect(() => {
    checkServerHealth()
    
    // Clear any existing errors when this component mounts
    return () => {
      clearError()
    }
  }, [clearError])

  const handleRetry = async () => {
    setLoading(true)
    
    // Check server health before retrying
    await checkServerHealth()
    
    if (onRetry) {
      onRetry()
    } else {
      // Check if servers are healthy now
      if (serverStatus?.healthy_servers > 0) {
        // Clear error and go back to previous page or home
        clearError()
        navigate(-1)
      } else {
        // Refresh the page
        window.location.reload()
      }
    }
    
    setLoading(false)
  }

  const handleGoHome = () => {
    clearError()
    navigate('/')
  }

  const getServerStatusDisplay = () => {
    if (!serverStatus) return null

    return (
      <Card sx={{ mt: 3 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Server Status
          </Typography>
          
          <Stack spacing={2}>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Load Balancer: {serverStatus.status === 'healthy' ? 'Online' : 'Offline'}
              </Typography>
              <Typography variant="body2">
                Healthy Servers: {serverStatus.healthy_servers}/{serverStatus.total_servers}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Requests: {serverStatus.total_requests || 0}
              </Typography>
            </Box>

            <Divider />

            <List dense>
              {serverStatus.servers?.map((server: any, index: number) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    {server.healthy ? (
                      <CheckCircleIcon color="success" />
                    ) : (
                      <CancelIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={server.url}
                    secondary={`Load: ${server.current_load} requests`}
                  />
                  <Chip
                    label={server.healthy ? 'Online' : 'Offline'}
                    color={server.healthy ? 'success' : 'error'}
                    size="small"
                  />
                </ListItem>
              ))}
            </List>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  // Show retry button only if we have healthy servers
  const hasHealthyServers = serverStatus?.healthy_servers > 0
  const showRetryButton = hasHealthyServers || !serverStatus

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '80vh',
        p: 2
      }}
    >
      <Card sx={{ maxWidth: 600, width: '100%' }}>
        <CardContent sx={{ p: 4, textAlign: 'center' }}>
          <ErrorIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
          
          <Typography variant="h4" component="h1" gutterBottom>
            Server Error
          </Typography>

          <Alert severity="error" sx={{ mb: 3, textAlign: 'left' }}>
            <Typography variant="h6" gutterBottom>
              Connection Failed
            </Typography>
            <Typography variant="body2">
              {error}
            </Typography>
            {serverUrl && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                <strong>Server:</strong> {serverUrl}
              </Typography>
            )}
          </Alert>

          <Stack spacing={2} direction={{ xs: 'column', sm: 'row' }} sx={{ mb: 3 }}>
            {showRetryButton && (
              <Button
                variant="contained"
                startIcon={loading ? <CircularProgress size={20} /> : <RefreshIcon />}
                onClick={handleRetry}
                disabled={loading}
                fullWidth
                color={hasHealthyServers ? 'success' : 'primary'}
              >
                {loading ? 'Retrying...' : hasHealthyServers ? 'Servers Online - Retry' : 'Retry Connection'}
              </Button>
            )}
            
            <Button
              variant="outlined"
              onClick={handleGoHome}
              fullWidth
            >
              Go to Home
            </Button>
          </Stack>

          {hasHealthyServers && (
            <Alert severity="success" sx={{ mb: 3 }}>
              Good news! Some servers are back online. Click "Retry" to reconnect.
            </Alert>
          )}

          <Divider sx={{ my: 3 }}>
            <Chip label="Server Options" size="small" />
          </Divider>

          <Stack spacing={2}>
            <Alert severity="info" sx={{ textAlign: 'left' }}>
              <Typography variant="subtitle2" gutterBottom>
                Troubleshooting Options:
              </Typography>
              <Typography variant="body2">
                • Check server status and refresh the page
                <br />
                • Wait for backend servers to come back online
                <br />
                • Contact support if the problem persists
              </Typography>
            </Alert>

            <Stack spacing={1} direction={{ xs: 'column', sm: 'row' }}>
              <Button
                variant="outlined"
                startIcon={isCheckingHealth ? <CircularProgress size={16} /> : <RefreshIcon />}
                onClick={checkServerHealth}
                disabled={isCheckingHealth}
                size="small"
                fullWidth
              >
                Check Status
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => window.location.reload()}
                size="small"
                fullWidth
              >
                Refresh Page
              </Button>
            </Stack>
          </Stack>

          {getServerStatusDisplay()}
        </CardContent>
      </Card>
    </Box>
  )
}

export default ServerError 