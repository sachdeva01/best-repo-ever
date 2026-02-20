import apiClient from './client'

export const fetchMarketData = async () => {
  const { data } = await apiClient.get('/api/market-data')
  return data
}

export const refreshMarketData = async () => {
  const { data } = await apiClient.post('/api/market-data/refresh')
  return data
}
