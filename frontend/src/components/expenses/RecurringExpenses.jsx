import { useState, useEffect } from 'react'
import { fetchRecurringExpenses } from '../../api/expenseTracking'
import { formatCurrency } from '../../utils/formatters'
import './RecurringExpenses.css'

function RecurringExpenses({ refreshTrigger }) {
  const [recurring, setRecurring] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadRecurringExpenses()
  }, [refreshTrigger])

  const loadRecurringExpenses = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchRecurringExpenses()
      setRecurring(data)
    } catch (err) {
      setError(err.message || 'Failed to load recurring expenses')
    } finally {
      setLoading(false)
    }
  }

  const getRecurrenceLabel = (period, intervalYears) => {
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

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (loading) {
    return <div className="loading">Loading recurring expenses...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  if (!recurring || recurring.recurring_expenses.length === 0) {
    return (
      <div className="recurring-expenses">
        <div className="empty-state">
          <h3>No Recurring Expenses</h3>
          <p>You haven't added any recurring expenses yet. Go to "Add Expense" and check the "This is a recurring expense" box.</p>
        </div>
      </div>
    )
  }

  // Group by recurrence period
  const groupedByPeriod = recurring.recurring_expenses.reduce((groups, expense) => {
    const period = expense.recurrence_period
    if (!groups[period]) {
      groups[period] = []
    }
    groups[period].push(expense)
    return groups
  }, {})

  const periodOrder = ['MONTHLY', 'QUARTERLY', 'YEARLY', 'MULTI_YEAR']
  const periodLabels = {
    MONTHLY: 'Monthly Expenses',
    QUARTERLY: 'Quarterly Expenses',
    YEARLY: 'Annual Expenses',
    MULTI_YEAR: 'Multi-Year Expenses'
  }

  return (
    <div className="recurring-expenses">
      <div className="recurring-header">
        <div>
          <h3>Recurring Expenses</h3>
          <p className="subtitle">Automatic bills and regular expenses</p>
        </div>
        <div className="total-annual-card">
          <div className="card-label">Total Annual Cost</div>
          <div className="card-value">{formatCurrency(recurring.total_annual_recurring)}</div>
        </div>
      </div>

      {periodOrder.map(period => {
        const expenses = groupedByPeriod[period]
        if (!expenses || expenses.length === 0) return null

        const periodTotal = expenses.reduce((sum, e) => sum + e.annual_amount, 0)

        return (
          <div key={period} className="period-section">
            <div className="period-header">
              <h4>{periodLabels[period]}</h4>
              <span className="period-total">
                Annual: {formatCurrency(periodTotal)}
              </span>
            </div>

            <div className="expenses-grid">
              {expenses.map(expense => (
                <div key={expense.id} className="expense-card">
                  <div className="expense-card-header">
                    <span className="category-name">{expense.category_name}</span>
                    <span className="frequency-badge">
                      {getRecurrenceLabel(expense.recurrence_period, expense.recurrence_interval_years)}
                    </span>
                  </div>

                  {expense.description && (
                    <div className="expense-description">
                      {expense.description}
                    </div>
                  )}

                  <div className="expense-amounts">
                    <div className="amount-row">
                      <span className="amount-label">Per Payment:</span>
                      <span className="amount-value">{formatCurrency(expense.amount)}</span>
                    </div>
                    <div className="amount-row highlight">
                      <span className="amount-label">Annual Cost:</span>
                      <span className="amount-value">{formatCurrency(expense.annual_amount)}</span>
                    </div>
                  </div>

                  <div className="expense-footer">
                    <span className="next-date">
                      Next: {formatDate(expense.next_date)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}

      <div className="recurring-summary">
        <h4>💡 Recurring Expense Breakdown</h4>
        <div className="summary-grid">
          <div className="summary-item">
            <span className="summary-label">Total Monthly Equivalent:</span>
            <span className="summary-value">
              {formatCurrency(recurring.total_annual_recurring / 12)}
            </span>
          </div>
          <div className="summary-item">
            <span className="summary-label">Total Expenses Tracked:</span>
            <span className="summary-value">
              {recurring.recurring_expenses.length}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RecurringExpenses
