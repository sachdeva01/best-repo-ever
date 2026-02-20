import apiClient from './client'

export const fetchRebalancingAnalysis = async () => {
  const { data } = await apiClient.get('/api/rebalancing/analysis')
  return data
}

export const fetchPortfolioRecommendations = async () => {
  const { data } = await apiClient.get('/api/rebalancing/recommendations')
  return data
}
