import { useQuery, useQueryClient } from '@tanstack/react-query'
import { fetchQuickStats, fetchAssetAllocation } from '../api/dashboard'
import { fetchMarketData } from '../api/marketData'
import { fetchExpectedReturns, fetchIncomeComparison } from '../api/expectedReturns'
import { fetchRetirementConfig } from '../api/retirement'
import { queryKeys } from '../api/queryKeys'

export const useDashboard = () => {
  const queryClient = useQueryClient()

  const quickStatsQuery = useQuery({
    queryKey: queryKeys.dashboard.quickStats(),
    queryFn: fetchQuickStats,
  })

  const allocationQuery = useQuery({
    queryKey: queryKeys.dashboard.allocation(),
    queryFn: fetchAssetAllocation,
  })

  const marketDataQuery = useQuery({
    queryKey: queryKeys.marketData.all,
    queryFn: fetchMarketData,
    staleTime: 30 * 1000,
  })

  const expectedReturnsQuery = useQuery({
    queryKey: queryKeys.expectedReturns.all,
    queryFn: fetchExpectedReturns,
  })

  const incomeComparisonQuery = useQuery({
    queryKey: queryKeys.expectedReturns.income(),
    queryFn: fetchIncomeComparison,
  })

  const retirementConfigQuery = useQuery({
    queryKey: queryKeys.retirement.config(),
    queryFn: fetchRetirementConfig,
  })

  const queries = [
    quickStatsQuery,
    allocationQuery,
    marketDataQuery,
    expectedReturnsQuery,
    incomeComparisonQuery,
    retirementConfigQuery,
  ]

  const loading = queries.some((q) => q.isLoading)
  const error = queries.find((q) => q.error)?.error?.message || null

  const refetch = () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.marketData.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.expectedReturns.all })
    queryClient.invalidateQueries({ queryKey: queryKeys.retirement.config() })
  }

  return {
    quickStats: quickStatsQuery.data ?? null,
    allocation: allocationQuery.data ?? null,
    marketData: marketDataQuery.data ?? null,
    expectedReturns: expectedReturnsQuery.data ?? null,
    incomeComparison: incomeComparisonQuery.data ?? null,
    retirementConfig: retirementConfigQuery.data ?? null,
    loading,
    error,
    refetch,
  }
}
