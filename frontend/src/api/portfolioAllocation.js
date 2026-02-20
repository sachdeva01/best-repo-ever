import apiClient from './client'

export const fetchPortfolioAllocation = async () => {
  const { data } = await apiClient.get('/api/portfolio-allocation/calculate')
  return data
}

export const implementPortfolioAllocation = async () => {
  const { data } = await apiClient.post('/api/portfolio-allocation/implement')
  return data
}

export const fetchHistoricalPerformance = async () => {
  const { data } = await apiClient.get('/api/portfolio-allocation/historical-performance')
  return data
}
