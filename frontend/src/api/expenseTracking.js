import apiClient from './client'

// Expense CRUD operations
export const fetchExpenses = async (filters = {}) => {
  const params = new URLSearchParams()
  if (filters.category_id) params.append('category_id', filters.category_id)
  if (filters.start_date) params.append('start_date', filters.start_date)
  if (filters.end_date) params.append('end_date', filters.end_date)

  const { data } = await apiClient.get(`/api/expenses?${params}`)
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
  const { data } = await apiClient.delete(`/api/expenses/${id}`)
  return data
}

// Analytics endpoints
export const fetchDetailedSummary = async (startDate, endDate) => {
  const params = new URLSearchParams()
  if (startDate) params.append('start_date', startDate)
  if (endDate) params.append('end_date', endDate)

  const { data } = await apiClient.get(`/api/expenses/detailed/summary?${params}`)
  return data
}

export const fetchMonthlyAnalytics = async (year) => {
  const params = year ? `?year=${year}` : ''
  const { data} = await apiClient.get(`/api/expenses/analytics/monthly${params}`)
  return data
}

export const fetchRecurringExpenses = async () => {
  const { data } = await apiClient.get('/api/expenses/recurring')
  return data
}

export const fetchOneTimeExpenses = async (upcomingYears = 5) => {
  const { data } = await apiClient.get(`/api/expenses/one-time?upcoming_years=${upcomingYears}`)
  return data
}

// Expense categories
export const fetchExpenseCategories = async () => {
  const { data } = await apiClient.get('/api/expense-categories')
  return data
}

export const updateExpenseCategory = async (id, categoryData) => {
  const { data } = await apiClient.put(`/api/expense-categories/${id}`, categoryData)
  return data
}

// Get total annual expenses
export const fetchTotalAnnualExpenses = async () => {
  const { data } = await apiClient.get('/api/expenses/total-annual')
  return data
}
