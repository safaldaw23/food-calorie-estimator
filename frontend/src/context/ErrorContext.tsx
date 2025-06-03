import React, { createContext, useContext, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { ApiError } from '../utils/apiErrorHandler'

interface ErrorContextType {
  error: ApiError | null
  setError: (error: ApiError | null) => void
  clearError: () => void
  handleServerError: (error: ApiError) => void
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined)

export const useError = () => {
  const context = useContext(ErrorContext)
  if (context === undefined) {
    throw new Error('useError must be used within an ErrorProvider')
  }
  return context
}

interface ErrorProviderProps {
  children: ReactNode
}

export const ErrorProvider: React.FC<ErrorProviderProps> = ({ children }) => {
  const [error, setError] = useState<ApiError | null>(null)
  const navigate = useNavigate()

  const clearError = () => {
    setError(null)
  }

  const handleServerError = (apiError: ApiError) => {
    setError(apiError)
    
    // If it's a server down error, navigate to error page
    if (apiError.isServerDown) {
      navigate('/server-error', { 
        state: { 
          error: apiError.message,
          serverUrl: apiError.serverUrl 
        } 
      })
    }
  }

  const value: ErrorContextType = {
    error,
    setError,
    clearError,
    handleServerError
  }

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  )
} 