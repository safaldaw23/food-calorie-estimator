import { Box, Typography, Card, CardContent, Button, Alert } from '@mui/material'
import { useState } from 'react'
import { API_BASE_URL, getConnectionInfo, checkLoadBalancerHealth } from '../config/api'

const Home = () => {
  const [healthStatus, setHealthStatus] = useState<any>(null)
  const [healthError, setHealthError] = useState<string | null>(null)
  
  const connectionInfo = getConnectionInfo()

  const testConnection = async () => {
    try {
      setHealthError(null)
      console.log('🔍 Testing load balancer connection...')
      const health = await checkLoadBalancerHealth()
      setHealthStatus(health)
      console.log('✅ Load balancer health check successful:', health)
    } catch (error: any) {
      console.error('❌ Load balancer health check failed:', error)
      setHealthError(error.message || 'Connection test failed')
    }
  }

  return (
    <Box
      sx={{
        width: '100%',
        maxWidth: 1200,
        px: { xs: 2, sm: 4, md: 6 },
        py: { xs: 2, sm: 3, md: 4 },
      }}
    >
      <Typography 
        variant="h3" 
        component="h1" 
        gutterBottom
        sx={{
          fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' },
          textAlign: 'center',
          mb: { xs: 3, sm: 4, md: 6 },
        }}
      >
        🍎 Food Calorie Estimator
      </Typography>

      <Typography 
        variant="h6" 
        sx={{
          textAlign: 'center',
          color: 'text.secondary',
          mb: 4,
          fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' },
        }}
      >
        AI-powered food recognition and nutrition analysis
      </Typography>

      {/* API Debug Information */}
      <Card sx={{ mb: 4, bgcolor: 'background.paper' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom color="primary">
            🔧 API Configuration Debug
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 2 }}>
            <strong>API Base URL:</strong> {API_BASE_URL}
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 2 }}>
            <strong>Environment:</strong> {connectionInfo.environment}
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 2 }}>
            <strong>Architecture:</strong> {connectionInfo.architecture}
          </Typography>
          
          <Typography variant="body2" sx={{ mb: 3 }}>
            <strong>Detected Mode:</strong> {connectionInfo.detectedMode}
          </Typography>

          <Button 
            variant="outlined" 
            onClick={testConnection}
            sx={{ mb: 2 }}
          >
            Test Load Balancer Connection
          </Button>

          {healthStatus && (
            <Alert severity="success" sx={{ mb: 2 }}>
              <Typography variant="body2">
                ✅ Load Balancer is healthy! 
                {healthStatus.healthy_servers && (
                  <span> ({healthStatus.healthy_servers}/{healthStatus.total_servers} servers online)</span>
                )}
              </Typography>
            </Alert>
          )}

          {healthError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2">
                ❌ Connection failed: {healthError}
              </Typography>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' },
          gap: 4,
          mt: 4,
        }}
      >
        <Card
          sx={{
            height: 'fit-content',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
            },
          }}
        >
          <CardContent>
            <Typography variant="h5" gutterBottom color="primary">
              🔍 Single Image Analysis
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Upload a single food image to get instant nutrition information including calories, protein, carbs, and fat content.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Perfect for quick meal logging and nutrition tracking.
            </Typography>
          </CardContent>
        </Card>

        <Card
          sx={{
            height: 'fit-content',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
            },
          }}
        >
          <CardContent>
            <Typography variant="h5" gutterBottom color="primary">
              📊 Batch Processing
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Upload multiple images at once for efficient bulk analysis. Great for meal prep and restaurant menu analysis.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Process up to 20 images simultaneously with progress tracking.
            </Typography>
          </CardContent>
        </Card>

        <Card
          sx={{
            height: 'fit-content',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
            },
          }}
        >
          <CardContent>
            <Typography variant="h5" gutterBottom color="primary">
              📈 Analytics Dashboard
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              View comprehensive analytics of your food analysis history with interactive charts and insights.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Track calories, macronutrients, and food trends over time.
            </Typography>
          </CardContent>
        </Card>

        <Card
          sx={{
            height: 'fit-content',
            transition: 'transform 0.2s ease-in-out',
            '&:hover': {
              transform: 'translateY(-4px)',
            },
          }}
        >
          <CardContent>
            <Typography variant="h5" gutterBottom color="primary">
              🕒 History Tracking
            </Typography>
            <Typography variant="body1" color="text.secondary" paragraph>
              Access your complete analysis history with search and filtering capabilities.
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Never lose track of your nutrition data with persistent storage.
            </Typography>
          </CardContent>
        </Card>
      </Box>

      <Box sx={{ textAlign: 'center', mt: 6 }}>
        <Typography variant="body1" color="text.secondary">
          Powered by AI and machine learning for accurate food recognition
        </Typography>
      </Box>
    </Box>
  )
}

export default Home 