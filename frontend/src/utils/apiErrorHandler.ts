interface ApiErrorDetails {
  message: string
  status: number
  serverUrl?: string
  isServerDown: boolean
}

export class ApiError extends Error {
  public status: number
  public serverUrl?: string
  public isServerDown: boolean

  constructor(details: ApiErrorDetails) {
    super(details.message)
    this.name = 'ApiError'
    this.status = details.status
    this.serverUrl = details.serverUrl
    this.isServerDown = details.isServerDown
  }
}

export const createApiError = (
  error: any, 
  url?: string, 
  defaultMessage = 'An unexpected error occurred'
): ApiError => {
  // Handle different types of errors
  if (error instanceof Response) {
    return new ApiError({
      message: `HTTP ${error.status}: ${error.statusText}`,
      status: error.status,
      serverUrl: url,
      isServerDown: error.status >= 500 || error.status === 503
    })
  }

  if (error instanceof TypeError && error.message.includes('fetch')) {
    // Network error - likely server is down
    return new ApiError({
      message: 'Unable to connect to server. Please check if the server is running.',
      status: 0,
      serverUrl: url,
      isServerDown: true
    })
  }

  if (error.name === 'AbortError') {
    return new ApiError({
      message: 'Request was cancelled',
      status: 0,
      serverUrl: url,
      isServerDown: false
    })
  }

  // Handle specific error response patterns
  if (error.response) {
    const status = error.response.status || 500
    const message = error.response.data?.error || 
                   error.response.data?.message || 
                   error.response.statusText || 
                   'Server error'
    
    return new ApiError({
      message,
      status,
      serverUrl: url,
      isServerDown: status >= 500 || status === 503 || status === 502
    })
  }

  // Handle axios-style errors
  if (error.request) {
    return new ApiError({
      message: 'No response from server. Server may be down.',
      status: 0,
      serverUrl: url,
      isServerDown: true
    })
  }

  // Generic error
  return new ApiError({
    message: error.message || defaultMessage,
    status: 500,
    serverUrl: url,
    isServerDown: false
  })
}

export const handleApiError = (error: any, url?: string) => {
  const apiError = createApiError(error, url)
  
  console.error('API Error:', {
    message: apiError.message,
    status: apiError.status,
    serverUrl: apiError.serverUrl,
    isServerDown: apiError.isServerDown
  })

  return apiError
}

// Enhanced fetch wrapper with error handling
export const apiRequest = async (
  url: string,
  options: RequestInit = {},
  timeout = 10000
): Promise<Response> => {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)

  try {
    // Don't set Content-Type for FormData - let browser handle it
    let headers = { ...options.headers }
    
    // Only set Content-Type to application/json if body is not FormData and no content-type is already set
    if (!(options.body instanceof FormData)) {
      const hasContentType = headers && (
        (headers as any)['Content-Type'] || 
        (headers as any)['content-type']
      )
      
      if (!hasContentType) {
        headers = {
          ...headers,
          'Content-Type': 'application/json'
        }
      }
    }

    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw createApiError(response, url)
    }

    return response
  } catch (error) {
    clearTimeout(timeoutId)
    throw handleApiError(error, url)
  }
}

// Specialized request functions
export const apiGet = async (url: string, timeout?: number) => {
  return apiRequest(url, { method: 'GET' }, timeout)
}

export const apiPost = async (url: string, data?: any, timeout?: number) => {
  return apiRequest(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined
  }, timeout)
}

export const apiPostFormData = async (url: string, formData: FormData, timeout?: number) => {
  return apiRequest(url, {
    method: 'POST',
    body: formData,
    headers: {} // Don't set Content-Type for FormData, let browser set it
  }, timeout)
} 