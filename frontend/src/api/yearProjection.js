import apiClient from './client'

export const fetchYearProjection = async (params = {}) => {
  const { data } = await apiClient.get('/api/year-projection', { params })
  return data
}
