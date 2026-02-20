import { useState, useEffect } from 'react'
import { fetchOneTimeExpenses } from '../../api/expenseTracking'
import { formatCurrency } from '../../utils/formatters'
import './OneTimeExpenses.css'

function OneTimeExpenses({ refreshTrigger }) {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [upcomingYears, setUpcomingYears] = useState(5)

  useEffect(() => {
    loadOneTimeExpenses()
  }, [refreshTrigger, upcomingYears])

  const loadOneTimeExpenses = async () => {
    try {
      setLoading(true)
      setError(null)
      const result = await fetchOneTimeExpenses(upcomingYears)
      setData(result)
    } catch (err) {
      setError(err.message || 'Failed to load one-time expenses')
    } finally {
      setLoading(false)
    }
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const groupByYear = (expenses) => {
    const groups = {}
    expenses.forEach(expense => {
      const year = new Date(expense.projected_date).getFullYear()
      if (!groups[year]) {
        groups[year] = []
      }
      groups[year].push(expense)
    })
    return groups
  }

  if (loading) {
    return <div className="loading">Loading one-time expenses...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  const projectedByYear = data.projected_future_expenses.length > 0
    ? groupByYear(data.projected_future_expenses)
    : {}

  return (
    <div className="one-time-expenses">
      <div className="onetime-header">
        <div>
          <h3>One-Time & Big Purchases</h3>
          <p className="subtitle">Track major expenses and plan for future purchases like cars</p>
        </div>
        <div className="projection-controls">
          <label>Look ahead:</label>
          <select
            value={upcomingYears}
            onChange={(e) => setUpcomingYears(parseInt(e.target.value))}
          >
            <option value="3">3 years</option>
            <option value="5">5 years</option>
            <option value="10">10 years</option>
            <option value="15">15 years</option>
            <option value="20">20 years</option>
          </select>
        </div>
      </div>

      {data.projected_future_expenses.length > 0 && (
        <div className="future-section">
          <div className="section-header">
            <h4>📅 Projected Future Expenses</h4>
            <div className="total-upcoming">
              Next {upcomingYears} years: {formatCurrency(data.total_upcoming_5_years)}
            </div>
          </div>

          {Object.keys(projectedByYear).sort().map(year => {
            const expenses = projectedByYear[year]
            const yearTotal = expenses.reduce((sum, e) => sum + e.amount, 0)
            const yearsFromNow = expenses[0].years_from_now

            return (
              <div key={year} className="year-group">
                <div className="year-header">
                  <div className="year-info">
                    <span className="year-label">{year}</span>
                    <span className="years-away">
                      ({yearsFromNow} year{yearsFromNow !== 1 ? 's' : ''} from now)
                    </span>
                  </div>
                  <span className="year-total">{formatCurrency(yearTotal)}</span>
                </div>

                <div className="expenses-list">
                  {expenses.map((expense, idx) => (
                    <div key={`${expense.id}-${idx}`} className="expense-item future">
                      <div className="expense-icon">🔮</div>
                      <div className="expense-content">
                        <div className="expense-title">
                          {expense.category_name}
                        </div>
                        {expense.description && (
                          <div className="expense-desc">{expense.description}</div>
                        )}
                        <div className="expense-meta">
                          Projected: {formatDate(expense.projected_date)}
                        </div>
                      </div>
                      <div className="expense-amount future-amount">
                        {formatCurrency(expense.amount)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {data.historical_one_time.length > 0 ? (
        <div className="historical-section">
          <div className="section-header">
            <h4>📝 Past One-Time Expenses</h4>
            <span className="count-badge">
              {data.historical_one_time.length} expense{data.historical_one_time.length !== 1 ? 's' : ''}
            </span>
          </div>

          <div className="expenses-list">
            {data.historical_one_time.map(expense => (
              <div key={expense.id} className="expense-item historical">
                <div className="expense-icon">✓</div>
                <div className="expense-content">
                  <div className="expense-title">
                    {expense.category_name}
                  </div>
                  {expense.description && (
                    <div className="expense-desc">{expense.description}</div>
                  )}
                  <div className="expense-meta">
                    Date: {formatDate(expense.date)}
                  </div>
                </div>
                <div className="expense-amount historical-amount">
                  {formatCurrency(expense.amount)}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        !data.projected_future_expenses.length && (
          <div className="empty-state">
            <h3>No One-Time Expenses Yet</h3>
            <p>Add expenses marked as "One-Time Purchase" or set up recurring multi-year expenses (like car replacements every 5 years) to see them here.</p>
            <div className="example-box">
              <strong>💡 Example:</strong> Add a car purchase with:
              <ul>
                <li>Category: Car Replacement</li>
                <li>Amount: $35,000</li>
                <li>Type: Recurring</li>
                <li>Frequency: Every Few Years → 5</li>
              </ul>
              The system will automatically project when you'll need to buy your next car!
            </div>
          </div>
        )
      )}

      {(data.projected_future_expenses.length > 0 || data.historical_one_time.length > 0) && (
        <div className="planning-tips">
          <h4>💡 Planning Tips</h4>
          <ul>
            <li><strong>Car Replacements:</strong> Set up as recurring every 5-7 years to budget ahead</li>
            <li><strong>Home Repairs:</strong> Major items like roof, HVAC every 10-15 years</li>
            <li><strong>Appliances:</strong> Expect replacements every 10-15 years</li>
            <li><strong>Emergency Fund:</strong> Keep 3-6 months expenses for unexpected costs</li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default OneTimeExpenses
