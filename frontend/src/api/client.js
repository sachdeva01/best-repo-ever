import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
})

// Add request interceptor for performance monitoring
apiClient.interceptors.request.use(
  (config) => {
    config.metadata = { startTime: new Date() }
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor for performance monitoring and error handling
apiClient.interceptors.response.use(
  (response) => {
    const duration = new Date() - response.config.metadata.startTime
    if (duration > 1000) {
      console.warn(`Slow API request: ${response.config.url} took ${duration}ms`)
    }
    return response
  },
  (error) => {
    if (error.code === 'ECONNABORTED') {
      console.error('Request timeout:', error.config.url)
      error.message = 'Request timed out. Please try again.'
    } else if (!error.response) {
      console.error('Network error:', error.message)
      error.message = 'Network error. Please check your connection.'
    } else if (error.response.status >= 500) {
      console.error('Server error:', error.response.data)
      error.message = 'Server error. Please try again later.'
    }
    return Promise.reject(error)
  }
)

export const healthCheck = async () => {
  const response = await apiClient.get('/api/health')
  return response.data
}

export default apiClient
