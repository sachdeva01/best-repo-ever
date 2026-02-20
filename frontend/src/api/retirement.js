import apiClient from './client'

export const fetchRetirementCalculation = async () => {
  const { data } = await apiClient.get('/api/retirement/calculation')
  return data
}

export const fetchRetirementConfig = async () => {
  const { data } = await apiClient.get('/api/retirement/config')
  return data
}

export const updateRetirementConfig = async (config) => {
  const { data } = await apiClient.post('/api/retirement/config', config)
  return data
}

export const fetchRetirementProjection = async () => {
  const { data } = await apiClient.get('/api/retirement/projection')
  return data
}

export const calculateScenario = async (scenarioParams) => {
  const { data } = await apiClient.post('/api/retirement/scenario', scenarioParams)
  return data
}
