import { useState, useEffect, useCallback } from 'react'
import {
  fetchRetirementCalculation,
  fetchRetirementConfig,
  updateRetirementConfig,
  fetchRetirementProjection,
  calculateScenario
} from '../api/retirement'

export const useRetirement = () => {
  const [calculation, setCalculation] = useState(null)
  const [config, setConfig] = useState(null)
  const [projection, setProjection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [calcData, configData, projData] = await Promise.all([
        fetchRetirementCalculation(),
        fetchRetirementConfig(),
        fetchRetirementProjection()
      ])

      setCalculation(calcData)
      setConfig(configData)
      setProjection(projData)
    } catch (err) {
      setError(err.message || 'Failed to load retirement data')
      console.error('Error loading retirement data:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  const updateConfig = async (configData) => {
    try {
      const updatedConfig = await updateRetirementConfig(configData)
      setConfig(updatedConfig)
      await loadData() // Reload all data after config update
      return updatedConfig
    } catch (err) {
      setError(err.message || 'Failed to update config')
      throw err
    }
  }

  const runScenario = async (scenarioParams) => {
    try {
      const scenarioResult = await calculateScenario(scenarioParams)
      return scenarioResult
    } catch (err) {
      setError(err.message || 'Failed to calculate scenario')
      throw err
    }
  }

  return {
    calculation,
    config,
    projection,
    loading,
    error,
    loadData,
    updateConfig,
    runScenario
  }
}
