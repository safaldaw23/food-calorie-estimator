import React from 'react'
import { Box, Paper, Typography, Chip } from '@mui/material'
import { useAuth } from '../context/AuthContext'

const DebugAuth: React.FC = () => {
  const { user, isAdmin, isAuthenticated } = useAuth()

  return (
    <Paper sx={{ p: 2, m: 2, backgroundColor: '#f5f5f5' }}>
      <Typography variant="h6" gutterBottom>
        🔍 Debug Auth Status
      </Typography>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="body2">Is Authenticated:</Typography>
          <Chip 
            label={isAuthenticated ? 'YES' : 'NO'} 
            color={isAuthenticated ? 'success' : 'error'} 
            size="small" 
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="body2">Is Admin:</Typography>
          <Chip 
            label={isAdmin ? 'YES' : 'NO'} 
            color={isAdmin ? 'success' : 'error'} 
            size="small" 
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="body2">User Role:</Typography>
          <Chip 
            label={user?.role || 'null'} 
            color={user?.role === 'admin' ? 'primary' : 'secondary'} 
            size="small" 
          />
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="body2">User Email:</Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {user?.email || 'null'}
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Typography variant="body2">User Name:</Typography>
          <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
            {user?.name || 'null'}
          </Typography>
        </Box>
      </Box>
    </Paper>
  )
}

export default DebugAuth 