import { useState, useEffect } from 'react'
import { fetchExpenseCategories, createExpense } from '../../api/expenseTracking'
import './ExpenseEntry.css'

function ExpenseEntry({ onExpenseAdded }) {
  const [categories, setCategories] = useState([])
  const [formData, setFormData] = useState({
    category_id: '',
    amount: '',
    description: '',
    expense_date: new Date().toISOString().split('T')[0],
    expense_type: 'HOUSEHOLD',
    is_recurring: false,
    recurrence_period: 'MONTHLY',
    recurrence_interval_years: ''
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      const data = await fetchExpenseCategories()
      setCategories(data)
    } catch (err) {
      console.error('Error loading categories:', err)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    try {
      const expenseData = {
        ...formData,
        category_id: parseInt(formData.category_id),
        amount: parseFloat(formData.amount),
        expense_date: new Date(formData.expense_date).toISOString(),
        recurrence_interval_years: formData.recurrence_interval_years ? parseInt(formData.recurrence_interval_years) : null
      }

      await createExpense(expenseData)
      setSuccess(true)

      // Reset form
      setFormData({
        category_id: '',
        amount: '',
        description: '',
        expense_date: new Date().toISOString().split('T')[0],
        expense_type: 'HOUSEHOLD',
        is_recurring: false,
        recurrence_period: 'MONTHLY',
        recurrence_interval_years: ''
      })

      if (onExpenseAdded) {
        onExpenseAdded()
      }

      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err.message || 'Failed to create expense')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  return (
    <div className="expense-entry">
      <div className="entry-card">
        <h3>Add New Expense</h3>

        {success && (
          <div className="success-message">
            ✓ Expense added successfully!
          </div>
        )}

        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="expense-form">
          <div className="form-grid">
            <div className="form-group">
              <label>Category *</label>
              <select
                name="category_id"
                value={formData.category_id}
                onChange={handleChange}
                required
              >
                <option value="">Select a category</option>
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
                value={formData.amount}
                onChange={handleChange}
                step="0.01"
                min="0"
                required
                placeholder="0.00"
              />
            </div>

            <div className="form-group">
              <label>Date *</label>
              <input
                type="date"
                name="expense_date"
                value={formData.expense_date}
                onChange={handleChange}
                required
              />
            </div>

            <div className="form-group">
              <label>Type *</label>
              <select
                name="expense_type"
                value={formData.expense_type}
                onChange={handleChange}
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
              value={formData.description}
              onChange={handleChange}
              placeholder="Optional description or notes"
            />
          </div>

          <div className="recurring-section">
            <div className="form-group checkbox-group">
              <label>
                <input
                  type="checkbox"
                  name="is_recurring"
                  checked={formData.is_recurring}
                  onChange={handleChange}
                />
                <span>This is a recurring expense</span>
              </label>
            </div>

            {formData.is_recurring && (
              <div className="recurring-options">
                <div className="form-group">
                  <label>Recurrence Frequency</label>
                  <select
                    name="recurrence_period"
                    value={formData.recurrence_period}
                    onChange={handleChange}
                  >
                    <option value="MONTHLY">Monthly</option>
                    <option value="QUARTERLY">Quarterly</option>
                    <option value="YEARLY">Yearly</option>
                    <option value="MULTI_YEAR">Every Few Years</option>
                  </select>
                </div>

                {formData.recurrence_period === 'MULTI_YEAR' && (
                  <div className="form-group">
                    <label>Repeat Every X Years</label>
                    <input
                      type="number"
                      name="recurrence_interval_years"
                      value={formData.recurrence_interval_years}
                      onChange={handleChange}
                      min="1"
                      placeholder="e.g., 5 for every 5 years"
                    />
                    <small className="form-hint">
                      Example: Car replacement every 5 years
                    </small>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="form-actions">
            <button type="submit" disabled={loading} className="submit-button">
              {loading ? 'Adding...' : '✓ Add Expense'}
            </button>
          </div>
        </form>

        <div className="quick-examples">
          <h4>💡 Common Examples:</h4>
          <ul>
            <li><strong>Monthly Bills:</strong> Mark as Recurring → Monthly (Electric, Internet, etc.)</li>
            <li><strong>Car Replacement:</strong> Mark as Recurring → Every Few Years → 5 years</li>
            <li><strong>One-Time Purchase:</strong> Select Type: One-Time Purchase (vacation, furniture, etc.)</li>
            <li><strong>Annual Insurance:</strong> Mark as Recurring → Yearly</li>
          </ul>
        </div>
      </div>
    </div>
  )
}

export default ExpenseEntry
