import React, { useState } from 'react'
import {
  Box,
  Card,
  CardContent,
  TextField,
  Button,
  Typography,
  Alert,
  Divider,
  Chip,
  Stack
} from '@mui/material'
import { useAuth } from '../context/AuthContext'

const Login: React.FC = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const success = await login(email, password)
      if (!success) {
        setError('Invalid email or password')
      }
    } catch (err) {
      setError('An error occurred during login')
    } finally {
      setLoading(false)
    }
  }

  const handleDemoLogin = async (demoEmail: string, demoPassword: string) => {
    setEmail(demoEmail)
    setPassword(demoPassword)
    setError('')
    setLoading(true)

    try {
      const success = await login(demoEmail, demoPassword)
      if (!success) {
        setError('Demo login failed')
      }
    } catch (err) {
      setError('An error occurred during demo login')
    } finally {
      setLoading(false)
    }
  }

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
      <Card sx={{ maxWidth: 400, width: '100%' }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom align="center">
            Login
          </Typography>
          
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Box component="form" onSubmit={handleSubmit} sx={{ mt: 2 }}>
            <TextField
              fullWidth
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              margin="normal"
              required
            />
            <Button
              type="submit"
              fullWidth
              variant="contained"
              sx={{ mt: 3, mb: 2 }}
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>
          </Box>

          <Divider sx={{ my: 3 }}>
            <Chip label="Demo Accounts" size="small" />
          </Divider>

          <Stack spacing={2}>
            <Button
              variant="outlined"
              onClick={() => handleDemoLogin('admin@food.com', 'admin123')}
              disabled={loading}
              sx={{ justifyContent: 'space-between' }}
            >
              <span>Admin Demo</span>
              <Chip label="Full Access" color="primary" size="small" />
            </Button>
            <Button
              variant="outlined"
              onClick={() => handleDemoLogin('user@food.com', 'user123')}
              disabled={loading}
              sx={{ justifyContent: 'space-between' }}
            >
              <span>User Demo</span>
              <Chip label="Limited Access" color="secondary" size="small" />
            </Button>
          </Stack>

          <Typography variant="body2" color="text.secondary" sx={{ mt: 3, textAlign: 'center' }}>
            Demo Credentials:
            <br />
            Admin: admin@food.com / admin123
            <br />
            User: user@food.com / user123
          </Typography>
        </CardContent>
      </Card>
    </Box>
  )
}

export default Login 