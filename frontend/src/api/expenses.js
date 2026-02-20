import apiClient from './client'

// Expense Categories
export const fetchExpenseCategories = async () => {
  const { data } = await apiClient.get('/api/expense-categories')
  return data
}

export const updateExpenseCategory = async (id, categoryData) => {
  const { data } = await apiClient.put(`/api/expense-categories/${id}`, categoryData)
  return data
}

export const getExpenseSummary = async () => {
  const { data } = await apiClient.get('/api/expenses/summary')
  return data
}

// Individual Expenses (optional detailed tracking)
export const fetchExpenses = async (params = {}) => {
  const { data } = await apiClient.get('/api/expenses', { params })
  return data
}

export const createExpense = async (expenseData) => {
  const { data } = await apiClient.post('/api/expenses', expenseData)
  return data
}

export const updateExpense = async (id, expenseData) => {
  const { data } = await apiClient.put(`/api/expenses/${id}`, expenseData)
  return data
}

export const deleteExpense = async (id) => {
  await apiClient.delete(`/api/expenses/${id}`)
}
