import apiClient from './client'

export const fetchMonteCarloSimulation = async (simulations = 1000) => {
  const { data } = await apiClient.get(`/api/monte-carlo/simulate?simulations=${simulations}`)
  return data
}
