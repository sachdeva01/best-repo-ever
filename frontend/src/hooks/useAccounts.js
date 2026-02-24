import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { fetchAccounts, createAccount, updateAccount, deleteAccount } from '../api/accounts'
import { queryKeys } from '../api/queryKeys'

export const useAccounts = () => {
  const queryClient = useQueryClient()

  const accountsQuery = useQuery({
    queryKey: queryKeys.accounts.all,
    queryFn: fetchAccounts,
  })

  const addAccountMutation = useMutation({
    mutationFn: (accountData) => createAccount(accountData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })

  const editAccountMutation = useMutation({
    mutationFn: ({ id, data }) => updateAccount(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })

  const removeAccountMutation = useMutation({
    mutationFn: (id) => deleteAccount(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.accounts.all })
      const previous = queryClient.getQueryData(queryKeys.accounts.all)
      queryClient.setQueryData(queryKeys.accounts.all, (old) =>
        old?.filter((acc) => acc.id !== id)
      )
      return { previous }
    },
    onError: (_err, _id, context) => {
      queryClient.setQueryData(queryKeys.accounts.all, context.previous)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
  })

  return {
    accounts: accountsQuery.data ?? [],
    loading: accountsQuery.isLoading,
    error: accountsQuery.error?.message || null,
    addAccount: addAccountMutation.mutateAsync,
    editAccount: (id, data) => editAccountMutation.mutateAsync({ id, data }),
    removeAccount: removeAccountMutation.mutateAsync,
    refetchAccounts: () => queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all }),
  }
}
