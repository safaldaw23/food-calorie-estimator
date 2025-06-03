import React from 'react';
import { AppBar, Toolbar, Typography, Button, Box, IconButton, Menu, MenuItem, useMediaQuery, useTheme, Avatar, Chip } from '@mui/material'
import { Link as RouterLink, useLocation } from 'react-router-dom'
import RestaurantIcon from '@mui/icons-material/Restaurant'
import MenuIcon from '@mui/icons-material/Menu'
import LogoutIcon from '@mui/icons-material/Logout'
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings'
import PersonIcon from '@mui/icons-material/Person'
import { useState } from 'react'
import { useAuth } from '../context/AuthContext'

const Navbar = () => {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null)
  const [userMenuAnchor, setUserMenuAnchor] = useState<null | HTMLElement>(null)
  const theme = useTheme()
  const isMobile = useMediaQuery(theme.breakpoints.down('md'))
  const location = useLocation()
  const { user, isAdmin, isAuthenticated, logout, switchRole } = useAuth()

  const handleMenu = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget)
  }

  const handleClose = () => {
    setAnchorEl(null)
  }

  const handleUserMenu = (event: React.MouseEvent<HTMLElement>) => {
    setUserMenuAnchor(event.currentTarget)
  }

  const handleUserMenuClose = () => {
    setUserMenuAnchor(null)
  }

  const handleLogout = () => {
    logout()
    handleUserMenuClose()
  }

  const handleRoleSwitch = (role: 'admin' | 'user') => {
    switchRole(role)
    handleUserMenuClose()
  }

  // Define menu items based on user role
  const getMenuItems = () => {
    const baseItems = [
      { text: 'Home', path: '/' },
      { text: 'Analyze', path: '/analyze' },
      { text: 'Batch Analyze', path: '/batch-analyze' }
    ]

    const userItems = [
      { text: 'History', path: '/history' }
    ]

    const adminItems = [
      { text: 'Dashboard', path: '/dashboard' }
    ]

    if (isAdmin) {
      return [...baseItems, ...userItems, ...adminItems]
    } else if (isAuthenticated) {
      return [...baseItems, ...userItems]
    } else {
      return baseItems
    }
  }

  const menuItems = getMenuItems()

  const renderUserInfo = () => {
    if (!isAuthenticated) return null

    return (
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Chip
          icon={isAdmin ? <AdminPanelSettingsIcon /> : <PersonIcon />}
          label={isAdmin ? 'Admin' : 'User'}
          color={isAdmin ? 'primary' : 'secondary'}
          size="small"
          variant="outlined"
          sx={{ color: 'white', borderColor: 'rgba(255, 255, 255, 0.5)' }}
        />
        <IconButton
          size="large"
          edge="end"
          color="inherit"
          onClick={handleUserMenu}
        >
          <Avatar sx={{ width: 32, height: 32, bgcolor: 'secondary.main' }}>
            {user?.name?.charAt(0).toUpperCase()}
          </Avatar>
        </IconButton>
      </Box>
    )
  }

  return (
    <AppBar position="static" sx={{ width: '100%' }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <RestaurantIcon sx={{ mr: 2 }} />
          <Typography 
            variant="h6" 
            component="div" 
            sx={{ 
              flexGrow: 1,
              fontSize: { xs: '1rem', sm: '1.25rem' }
            }}
          >
            Food Calorie Estimator
          </Typography>
        </Box>

        {isMobile ? (
          <>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {renderUserInfo()}
              <IconButton
                size="large"
                edge="end"
                color="inherit"
                aria-label="menu"
                onClick={handleMenu}
              >
                <MenuIcon />
              </IconButton>
            </Box>
            <Menu
              id="menu-appbar"
              anchorEl={anchorEl}
              anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              keepMounted
              transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
              }}
              open={Boolean(anchorEl)}
              onClose={handleClose}
            >
              {menuItems.map((item) => (
                <MenuItem 
                  key={item.text}
                  component={RouterLink} 
                  to={item.path}
                  onClick={handleClose}
                  selected={location.pathname === item.path}
                >
                  {item.text}
                </MenuItem>
              ))}
            </Menu>
          </>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              {menuItems.map((item) => (
                <Button 
                  key={item.text}
                  color="inherit" 
                  component={RouterLink} 
                  to={item.path}
                  sx={{
                    backgroundColor: location.pathname === item.path ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(255, 255, 255, 0.2)',
                    },
                  }}
                >
                  {item.text}
                </Button>
              ))}
            </Box>
            {renderUserInfo()}
          </Box>
        )}

        {/* User Menu */}
        <Menu
          id="user-menu"
          anchorEl={userMenuAnchor}
          anchorOrigin={{
            vertical: 'bottom',
            horizontal: 'right',
          }}
          keepMounted
          transformOrigin={{
            vertical: 'top',
            horizontal: 'right',
          }}
          open={Boolean(userMenuAnchor)}
          onClose={handleUserMenuClose}
        >
          <MenuItem disabled>
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
              <Typography variant="subtitle2">{user?.name}</Typography>
              <Typography variant="body2" color="text.secondary">{user?.email}</Typography>
            </Box>
          </MenuItem>
          <MenuItem onClick={() => handleRoleSwitch('admin')} disabled={isAdmin}>
            <AdminPanelSettingsIcon sx={{ mr: 1 }} />
            Switch to Admin
          </MenuItem>
          <MenuItem onClick={() => handleRoleSwitch('user')} disabled={!isAdmin}>
            <PersonIcon sx={{ mr: 1 }} />
            Switch to User
          </MenuItem>
          <MenuItem onClick={handleLogout}>
            <LogoutIcon sx={{ mr: 1 }} />
            Logout
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  )
}

export default Navbar 