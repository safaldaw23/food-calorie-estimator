// API Configuration for Food Calorie Estimator
// Using dedicated load balancer server with Docker support

import { apiRequest, ApiError } from '../utils/apiErrorHandler'

// Environment-based configuration for Docker and Local Development
const getLoadBalancerUrl = () => {
  // Check if we're running in a browser
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const protocol = window.location.protocol;
    
    // If hostname is localhost or 127.0.0.1, we're in local development
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:9000';
    }
    
    // Otherwise, use the current host with load balancer port (Docker)
    return `${protocol}//${hostname}:9000`;
  }
  
  // Fallback for SSR or non-browser environments
  return 'http://localhost:9000';
}

// Calculate the base URL once to avoid inconsistencies
const LOAD_BALANCER_BASE_URL = getLoadBalancerUrl();

export const API_CONFIG = {
  // Load Balancer Configuration
  LOAD_BALANCER: {
    BASE_URL: LOAD_BALANCER_BASE_URL,
    HEALTH_ENDPOINT: `${LOAD_BALANCER_BASE_URL}/health`,
    STATS_ENDPOINT: `${LOAD_BALANCER_BASE_URL}/stats`
  },
  
  // Backend Servers (for monitoring only - Docker service names)
  BACKEND_SERVERS: [
    { url: 'http://backend-1:8000', name: 'Backend Server 1' },
    { url: 'http://backend-2:8001', name: 'Backend Server 2' },
    { url: 'http://backend-3:8002', name: 'Backend Server 3' }
  ]
};

// Use load balancer for all API calls
export const API_BASE_URL = LOAD_BALANCER_BASE_URL;

// Simple API request wrapper (no client-side load balancing needed)
export const makeApiRequest = async (endpoint: string, options: any = {}, timeout: number = 30000) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  try {
    console.log(`🌐 Making request to Load Balancer: ${endpoint} -> ${url}`);
    
    const response = await apiRequest(url, options, timeout);
    
    console.log(`✅ Load Balancer response received for: ${endpoint}`);
    return response;
    
  } catch (error) {
    console.error(`❌ Load Balancer request failed for ${endpoint}:`, error);
    
    if (error instanceof ApiError) {
      throw error;
    }
    
    throw new ApiError({
      message: `Load Balancer request failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      status: 0,
      serverUrl: url,
      isServerDown: true
    });
  }
};

// Check load balancer health
export const checkLoadBalancerHealth = async (): Promise<any> => {
  try {
    const response = await apiRequest(API_CONFIG.LOAD_BALANCER.HEALTH_ENDPOINT, {
      method: 'GET'
    }, 10000);
    return await response.json();
  } catch (error) {
    console.error('Load Balancer health check failed:', error);
    if (error instanceof ApiError) {
      throw error;
    }
    throw new ApiError({
      message: 'Load Balancer is not responding',
      status: 0,
      serverUrl: API_CONFIG.LOAD_BALANCER.BASE_URL,
      isServerDown: true
    });
  }
};

// Get load balancer statistics
export const getLoadBalancerStats = async (): Promise<any> => {
  try {
    const response = await apiRequest(API_CONFIG.LOAD_BALANCER.STATS_ENDPOINT, {
      method: 'GET'
    }, 10000);
    return await response.json();
  } catch (error) {
    console.error('Load Balancer stats request failed:', error);
    throw error;
  }
};

// Check individual backend servers (for monitoring)
export const checkAllBackendServers = async (): Promise<{ url: string; healthy: boolean; data?: any }[]> => {
  const results = await Promise.allSettled(
    API_CONFIG.BACKEND_SERVERS.map(async (server) => {
      try {
        const response = await apiRequest(`${server.url}/health`, { method: 'GET' }, 5000);
        const data = await response.json();
        return { url: server.url, healthy: true, data };
      } catch (error) {
        return { url: server.url, healthy: false };
      }
    })
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      return { url: API_CONFIG.BACKEND_SERVERS[index].url, healthy: false };
    }
  });
};

// Get connection information for debugging
export const getConnectionInfo = () => {
  const isLocal = API_BASE_URL.includes('localhost');
  return {
    environment: isLocal ? 'Local Development' : 'Docker Containerized',
    architecture: 'Load Balancer + 3 Backend Servers',
    loadBalancer: {
      url: API_CONFIG.LOAD_BALANCER.BASE_URL,
      type: 'Dedicated Flask Server',
      algorithm: 'Round-Robin'
    },
    backendServers: API_CONFIG.BACKEND_SERVERS,
    currentUrl: API_BASE_URL,
    type: 'Server-Side Load Balancing',
    detectedMode: isLocal ? 'Local Development' : 'Docker'
  };
};

// Legacy exports for backward compatibility
export const getApiBaseUrl = () => API_BASE_URL;
export const loadBalancedRequest = makeApiRequest;

// API request wrapper
export { apiRequest, ApiError }

export default {
  API_CONFIG,
  API_BASE_URL,
  makeApiRequest,
  getConnectionInfo,
  checkLoadBalancerHealth,
  getLoadBalancerStats,
  checkAllBackendServers
}; 