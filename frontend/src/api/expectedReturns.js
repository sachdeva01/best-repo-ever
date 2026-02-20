import apiClient from './client'

export const fetchExpectedReturns = async () => {
  const { data } = await apiClient.get('/api/expected-returns')
  return data
}

export const fetchIncomeComparison = async () => {
  const { data } = await apiClient.get('/api/income-comparison')
  return data
}
