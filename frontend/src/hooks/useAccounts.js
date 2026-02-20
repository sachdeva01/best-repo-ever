import { useState, useEffect, useCallback } from 'react'
import { fetchAccounts, createAccount, updateAccount, deleteAccount } from '../api/accounts'

export const useAccounts = () => {
  const [accounts, setAccounts] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const loadAccounts = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchAccounts()
      setAccounts(data)
    } catch (err) {
      setError(err.message || 'Failed to load accounts')
      console.error('Error loading accounts:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAccounts()
  }, [loadAccounts])

  const addAccount = async (accountData) => {
    try {
      const newAccount = await createAccount(accountData)
      setAccounts(prev => [...prev, newAccount])
      return newAccount
    } catch (err) {
      setError(err.message || 'Failed to create account')
      throw err
    }
  }

  const editAccount = async (id, accountData) => {
    try {
      const updatedAccount = await updateAccount(id, accountData)
      setAccounts(prev => prev.map(acc => acc.id === id ? updatedAccount : acc))
      return updatedAccount
    } catch (err) {
      setError(err.message || 'Failed to update account')
      throw err
    }
  }

  const removeAccount = async (id) => {
    try {
      await deleteAccount(id)
      setAccounts(prev => prev.filter(acc => acc.id !== id))
    } catch (err) {
      setError(err.message || 'Failed to delete account')
      throw err
    }
  }

  return {
    accounts,
    loading,
    error,
    loadAccounts,
    addAccount,
    editAccount,
    removeAccount
  }
}
