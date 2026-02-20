import { useState, useEffect, useCallback } from 'react'
import { fetchQuickStats, fetchAssetAllocation } from '../api/dashboard'
import { fetchMarketData } from '../api/marketData'
import { fetchExpectedReturns, fetchIncomeComparison } from '../api/expectedReturns'
import { fetchRetirementConfig } from '../api/retirement'

export const useDashboard = () => {
  const [quickStats, setQuickStats] = useState(null)
  const [allocation, setAllocation] = useState(null)
  const [marketData, setMarketData] = useState(null)
  const [expectedReturns, setExpectedReturns] = useState(null)
  const [incomeComparison, setIncomeComparison] = useState(null)
  const [retirementConfig, setRetirementConfig] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadData = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)

      const [statsData, allocationData, marketDataResponse, expectedReturnsData, comparisonData, configData] = await Promise.all([
        fetchQuickStats(),
        fetchAssetAllocation(),
        fetchMarketData(),
        fetchExpectedReturns(),
        fetchIncomeComparison(),
        fetchRetirementConfig()
      ])

      setQuickStats(statsData)
      setAllocation(allocationData)
      setMarketData(marketDataResponse)
      setExpectedReturns(expectedReturnsData)
      setIncomeComparison(comparisonData)
      setRetirementConfig(configData)
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data')
      console.error('Error loading dashboard:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  return {
    quickStats,
    allocation,
    marketData,
    expectedReturns,
    incomeComparison,
    retirementConfig,
    loading,
    error,
    loadData
  }
}
