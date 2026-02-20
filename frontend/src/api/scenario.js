import apiClient from './client'

export const analyzeScenario = async (scenarioInput) => {
  const { data } = await apiClient.post('/api/scenario/analyze', scenarioInput)
  return data
}

export const fetchScenarioPresets = async () => {
  const { data } = await apiClient.get('/api/scenario/presets')
  return data
}
