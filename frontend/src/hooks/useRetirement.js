import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchRetirementCalculation,
  fetchRetirementConfig,
  updateRetirementConfig,
  fetchRetirementProjection,
  calculateScenario,
} from '../api/retirement'
import { queryKeys } from '../api/queryKeys'

export const useRetirement = () => {
  const queryClient = useQueryClient()

  const calculationQuery = useQuery({
    queryKey: queryKeys.retirement.calculation(),
    queryFn: fetchRetirementCalculation,
  })

  const configQuery = useQuery({
    queryKey: queryKeys.retirement.config(),
    queryFn: fetchRetirementConfig,
  })

  const projectionQuery = useQuery({
    queryKey: queryKeys.retirement.projection(),
    queryFn: fetchRetirementProjection,
  })

  const updateConfigMutation = useMutation({
    mutationFn: (configData) => updateRetirementConfig(configData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.retirement.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })

  const scenarioMutation = useMutation({
    mutationFn: (scenarioParams) => calculateScenario(scenarioParams),
  })

  const loading = calculationQuery.isLoading || configQuery.isLoading || projectionQuery.isLoading
  const error =
    calculationQuery.error?.message ||
    configQuery.error?.message ||
    projectionQuery.error?.message ||
    null

  return {
    calculation: calculationQuery.data ?? null,
    config: configQuery.data ?? null,
    projection: projectionQuery.data ?? null,
    loading,
    error,
    updateConfig: updateConfigMutation.mutateAsync,
    runScenario: scenarioMutation.mutateAsync,
  }
}
