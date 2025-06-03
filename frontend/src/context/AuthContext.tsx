import React, { createContext, useContext, useState, useEffect } from 'react'
import type { ReactNode } from 'react'

export type UserRole = 'admin' | 'user' | null

interface User {
  id: string
  name: string
  email: string
  role: UserRole
}

interface AuthContextType {
  user: User | null
  isAdmin: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  switchRole: (role: UserRole) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)

  // Load user from localStorage on mount
  useEffect(() => {
    const savedUser = localStorage.getItem('currentUser')
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser))
      } catch (error) {
        console.error('Error parsing saved user:', error)
        localStorage.removeItem('currentUser')
      }
    }
  }, [])

  // Save user to localStorage whenever user changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user))
    } else {
      localStorage.removeItem('currentUser')
    }
  }, [user])

  const login = async (email: string, password: string): Promise<boolean> => {
    // Simulate authentication - in real app this would be API call
    const mockUsers = {
      'admin@food.com': { id: '1', name: 'Admin User', email: 'admin@food.com', role: 'admin' as UserRole },
      'user@food.com': { id: '2', name: 'Regular User', email: 'user@food.com', role: 'user' as UserRole }
    }

    // Simple password check (in real app use proper authentication)
    if ((email === 'admin@food.com' && password === 'admin123') ||
        (email === 'user@food.com' && password === 'user123')) {
      const userData = mockUsers[email as keyof typeof mockUsers]
      setUser(userData)
      return true
    }
    
    return false
  }

  const logout = () => {
    setUser(null)
  }

  const switchRole = (role: UserRole) => {
    if (user && role) {
      setUser({ ...user, role })
    }
  }

  const value: AuthContextType = {
    user,
    isAdmin: user?.role === 'admin',
    isAuthenticated: user !== null,
    login,
    logout,
    switchRole
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
} 