import apiClient from './client'

export const fetchDashboardSummary = async () => {
  const { data } = await apiClient.get('/api/dashboard/summary')
  return data
}

export const fetchNetWorthHistory = async () => {
  const { data } = await apiClient.get('/api/dashboard/net-worth')
  return data
}

export const fetchAssetAllocation = async () => {
  const { data } = await apiClient.get('/api/dashboard/allocation')
  return data
}

export const fetchQuickStats = async () => {
  const { data } = await apiClient.get('/api/dashboard/quick-stats')
  return data
}
