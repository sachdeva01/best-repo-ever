import { useState, useEffect, useCallback } from 'react'
import { fetchExpenseCategories, updateExpenseCategory, getExpenseSummary } from '../api/expenses'

export const useExpenseCategories = () => {
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [summary, setSummary] = useState(null)

  const loadCategories = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchExpenseCategories()
      setCategories(data)
    } catch (err) {
      setError(err.message || 'Failed to load expense categories')
      console.error('Error loading categories:', err)
    } finally {
      setLoading(false)
    }
  }, [])

  const loadSummary = useCallback(async () => {
    try {
      const data = await getExpenseSummary()
      setSummary(data)
    } catch (err) {
      console.error('Error loading expense summary:', err)
    }
  }, [])

  useEffect(() => {
    loadCategories()
    loadSummary()
  }, [loadCategories, loadSummary])

  const updateCategory = async (id, categoryData) => {
    try {
      const updatedCategory = await updateExpenseCategory(id, categoryData)
      setCategories(prev => prev.map(cat => cat.id === id ? updatedCategory : cat))
      await loadSummary()
      return updatedCategory
    } catch (err) {
      setError(err.message || 'Failed to update category')
      throw err
    }
  }

  return {
    categories,
    summary,
    loading,
    error,
    loadCategories,
    loadSummary,
    updateCategory
  }
}
