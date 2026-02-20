import apiClient from './client'

export const generateModelPortfolio = async (requiredYield) => {
  const { data } = await apiClient.post('/api/portfolio/model', { required_yield: requiredYield })
  return data
}

export const fetchRecommendedAllocation = async () => {
  const { data } = await apiClient.get('/api/portfolio/allocation')
  return data
}
