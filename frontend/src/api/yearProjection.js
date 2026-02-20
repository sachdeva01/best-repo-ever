import apiClient from './client'

export const fetchYearProjection = async () => {
  const { data } = await apiClient.get('/api/year-projection')
  return data
}
