import { useState, useEffect } from 'react'
import { fetchExpenses, fetchExpenseCategories, deleteExpense, updateExpense } from '../../api/expenseTracking'
import { formatCurrency } from '../../utils/formatters'
import './ExpenseList.css'

function ExpenseList({ refreshTrigger }) {
  const [expenses, setExpenses] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [filters, setFilters] = useState({
    category_id: '',
    start_date: '',
    end_date: ''
  })
  const [editingExpense, setEditingExpense] = useState(null)
  const [editForm, setEditForm] = useState(null)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadData()
  }, [refreshTrigger])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      const [expensesData, categoriesData] = await Promise.all([
        fetchExpenses(filters),
        fetchExpenseCategories()
      ])
      setExpenses(expensesData)
      setCategories(categoriesData)
    } catch (err) {
      setError(err.message || 'Failed to load expenses')
    } finally {
      setLoading(false)
    }
  }

  const handleFilterChange = (e) => {
    const { name, value } = e.target
    setFilters(prev => ({ ...prev, [name]: value }))
  }

  const handleApplyFilters = () => {
    loadData()
  }

  const handleClearFilters = () => {
    setFilters({ category_id: '', start_date: '', end_date: '' })
    setTimeout(() => loadData(), 0)
  }

  const handleEdit = (expense) => {
    setEditingExpense(expense)
    setEditForm({
      category_id: expense.category_id,
      amount: expense.amount,
      description: expense.description || '',
      expense_date: new Date(expense.expense_date).toISOString().split('T')[0],
      is_recurring: expense.is_recurring,
      recurrence_period: expense.recurrence_period || 'MONTHLY',
      recurrence_interval_years: expense.recurrence_interval_years || '',
      expense_type: expense.expense_type || 'HOUSEHOLD'
    })
  }

  const handleCancelEdit = () => {
    setEditingExpense(null)
    setEditForm(null)
  }

  const handleEditFormChange = (e) => {
    const { name, value, type, checked } = e.target
    setEditForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  const handleSaveEdit = async () => {
    try {
      setSaving(true)
      const updateData = {
        ...editForm,
        category_id: parseInt(editForm.category_id),
        amount: parseFloat(editForm.amount),
        recurrence_interval_years: editForm.recurrence_interval_years ? parseInt(editForm.recurrence_interval_years) : null
      }

      await updateExpense(editingExpense.id, updateData)

      // Refresh the list
      await loadData()
      handleCancelEdit()
    } catch (err) {
      alert('Failed to update expense: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this expense?')) {
      return
    }

    try {
      await deleteExpense(id)
      setExpenses(prev => prev.filter(e => e.id !== id))
    } catch (err) {
      alert('Failed to delete expense: ' + err.message)
    }
  }

  const getCategoryName = (categoryId) => {
    const category = categories.find(c => c.id === categoryId)
    return category ? category.name : 'Unknown'
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getExpenseTypeLabel = (type) => {
    const labels = {
      HOUSEHOLD: 'Household',
      ONE_TIME: 'One-Time',
      RECURRING: 'Recurring'
    }
    return labels[type] || type
  }

  const getRecurrenceLabel = (period, intervalYears) => {
    if (!period) return '-'
    if (period === 'MULTI_YEAR' && intervalYears) {
      return `Every ${intervalYears} year${intervalYears > 1 ? 's' : ''}`
    }
    const labels = {
      MONTHLY: 'Monthly',
      QUARTERLY: 'Quarterly',
      YEARLY: 'Yearly',
      MULTI_YEAR: 'Multi-Year'
    }
    return labels[period] || period
  }

  const totalAmount = expenses.reduce((sum, exp) => sum + exp.amount, 0)

  if (loading) {
    return <div className="loading">Loading expenses...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  return (
    <div className="expense-list">
      <div className="list-header">
        <h3>All Expenses</h3>
        <div className="total-badge">
          Total: {formatCurrency(totalAmount)}
        </div>
      </div>

      <div className="filters-section">
        <div className="filters-grid">
          <div className="filter-group">
            <label>Category</label>
            <select
              name="category_id"
              value={filters.category_id}
              onChange={handleFilterChange}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Start Date</label>
            <input
              type="date"
              name="start_date"
              value={filters.start_date}
              onChange={handleFilterChange}
            />
          </div>

          <div className="filter-group">
            <label>End Date</label>
            <input
              type="date"
              name="end_date"
              value={filters.end_date}
              onChange={handleFilterChange}
            />
          </div>
        </div>

        <div className="filter-actions">
          <button onClick={handleApplyFilters} className="apply-button">
            Apply Filters
          </button>
          <button onClick={handleClearFilters} className="clear-button">
            Clear
          </button>
        </div>
      </div>

      {expenses.length === 0 ? (
        <div className="empty-state">
          <p>No expenses found. Try adjusting your filters or add a new expense.</p>
        </div>
      ) : (
        <div className="expenses-table-wrapper">
          <table className="expenses-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Type</th>
                <th>Recurrence</th>
                <th>Amount</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map(expense => (
                <tr key={expense.id}>
                  <td>{formatDate(expense.expense_date)}</td>
                  <td>
                    <span className="category-badge">
                      {getCategoryName(expense.category_id)}
                    </span>
                  </td>
                  <td className="description-cell">
                    {expense.description || <span className="no-description">-</span>}
                  </td>
                  <td>
                    <span className={`type-badge ${expense.expense_type?.toLowerCase()}`}>
                      {getExpenseTypeLabel(expense.expense_type)}
                    </span>
                  </td>
                  <td className="recurrence-cell">
                    {expense.is_recurring ? (
                      <span className="recurring-badge">
                        {getRecurrenceLabel(expense.recurrence_period, expense.recurrence_interval_years)}
                      </span>
                    ) : (
                      <span className="no-recurrence">-</span>
                    )}
                  </td>
                  <td className="amount-cell">
                    {formatCurrency(expense.amount)}
                  </td>
                  <td className="actions-cell">
                    <button
                      onClick={() => handleEdit(expense)}
                      className="edit-button"
                      title="Edit expense"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="delete-button"
                      title="Delete expense"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="list-footer">
        <p>Showing {expenses.length} expense{expenses.length !== 1 ? 's' : ''}</p>
      </div>

      {editingExpense && editForm && (
        <div className="edit-modal-overlay" onClick={handleCancelEdit}>
          <div className="edit-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Edit Expense</h3>
              <button className="close-button" onClick={handleCancelEdit}>✕</button>
            </div>

            <div className="modal-body">
              <div className="form-grid">
                <div className="form-group">
                  <label>Category *</label>
                  <select
                    name="category_id"
                    value={editForm.category_id}
                    onChange={handleEditFormChange}
                    required
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Amount *</label>
                  <input
                    type="number"
                    name="amount"
                    value={editForm.amount}
                    onChange={handleEditFormChange}
                    step="0.01"
                    min="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Date *</label>
                  <input
                    type="date"
                    name="expense_date"
                    value={editForm.expense_date}
                    onChange={handleEditFormChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Type *</label>
                  <select
                    name="expense_type"
                    value={editForm.expense_type}
                    onChange={handleEditFormChange}
                    required
                  >
                    <option value="HOUSEHOLD">Household/Regular</option>
                    <option value="ONE_TIME">One-Time Purchase</option>
                    <option value="RECURRING">Recurring Bill</option>
                  </select>
                </div>
              </div>

              <div className="form-group full-width">
                <label>Description</label>
                <input
                  type="text"
                  name="description"
                  value={editForm.description}
                  onChange={handleEditFormChange}
                  placeholder="Optional description"
                />
              </div>

              <div className="recurring-section">
                <div className="form-group checkbox-group">
                  <label>
                    <input
                      type="checkbox"
                      name="is_recurring"
                      checked={editForm.is_recurring}
                      onChange={handleEditFormChange}
                    />
                    <span>This is a recurring expense</span>
                  </label>
                </div>

                {editForm.is_recurring && (
                  <div className="recurring-options">
                    <div className="form-group">
                      <label>Recurrence Frequency</label>
                      <select
                        name="recurrence_period"
                        value={editForm.recurrence_period}
                        onChange={handleEditFormChange}
                      >
                        <option value="MONTHLY">Monthly</option>
                        <option value="QUARTERLY">Quarterly</option>
                        <option value="YEARLY">Yearly</option>
                        <option value="MULTI_YEAR">Every Few Years</option>
                      </select>
                    </div>

                    {editForm.recurrence_period === 'MULTI_YEAR' && (
                      <div className="form-group">
                        <label>Repeat Every X Years</label>
                        <input
                          type="number"
                          name="recurrence_interval_years"
                          value={editForm.recurrence_interval_years}
                          onChange={handleEditFormChange}
                          min="1"
                          placeholder="e.g., 5"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button
                onClick={handleCancelEdit}
                className="cancel-button"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="save-button"
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default ExpenseList
