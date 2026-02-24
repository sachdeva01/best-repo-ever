import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchExpenseCategories, updateExpenseCategory, getExpenseSummary } from '../api/expenses'
import { queryKeys } from '../api/queryKeys'

export const useExpenseCategories = () => {
  const queryClient = useQueryClient()

  const categoriesQuery = useQuery({
    queryKey: queryKeys.expenses.categories(),
    queryFn: fetchExpenseCategories,
  })

  const summaryQuery = useQuery({
    queryKey: queryKeys.expenses.summary(),
    queryFn: getExpenseSummary,
  })

  const updateCategoryMutation = useMutation({
    mutationFn: ({ id, data }) => updateExpenseCategory(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.expenses.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.retirement.all })
    },
  })

  const updateCategory = (id, data) => updateCategoryMutation.mutateAsync({ id, data })

  return {
    categories: categoriesQuery.data ?? [],
    summary: summaryQuery.data ?? null,
    loading: categoriesQuery.isLoading,
    error: categoriesQuery.error?.message || null,
    updateCategory,
  }
}
