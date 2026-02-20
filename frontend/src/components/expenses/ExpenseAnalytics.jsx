import { useState, useEffect } from 'react'
import { fetchMonthlyAnalytics, fetchDetailedSummary } from '../../api/expenseTracking'
import { formatCurrency } from '../../utils/formatters'
import './ExpenseAnalytics.css'

function ExpenseAnalytics({ refreshTrigger }) {
  const [monthlyData, setMonthlyData] = useState(null)
  const [detailedSummary, setDetailedSummary] = useState(null)
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear())
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadAnalytics()
  }, [refreshTrigger, selectedYear])

  const loadAnalytics = async () => {
    try {
      setLoading(true)
      setError(null)

      const startOfYear = `${selectedYear}-01-01`
      const endOfYear = `${selectedYear}-12-31`

      const [monthly, detailed] = await Promise.all([
        fetchMonthlyAnalytics(selectedYear),
        fetchDetailedSummary(startOfYear, endOfYear)
      ])

      setMonthlyData(monthly)
      setDetailedSummary(detailed)
    } catch (err) {
      setError(err.message || 'Failed to load analytics')
    } finally {
      setLoading(false)
    }
  }

  const getTopCategories = () => {
    if (!detailedSummary || !detailedSummary.category_breakdown) return []

    return Object.entries(detailedSummary.category_breakdown)
      .map(([name, data]) => ({ name, total: data.total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)
  }

  const getMonthlyAverage = () => {
    if (!monthlyData) return 0
    return monthlyData.annual_total / 12
  }

  const getHighestMonth = () => {
    if (!monthlyData) return null
    const months = monthlyData.monthly_data
    return months.reduce((max, month) => month.total > max.total ? month : max, months[0])
  }

  const getLowestMonth = () => {
    if (!monthlyData) return null
    const months = monthlyData.monthly_data.filter(m => m.total > 0)
    if (months.length === 0) return null
    return months.reduce((min, month) => month.total < min.total ? month : min, months[0])
  }

  if (loading) {
    return <div className="loading">Loading analytics...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  const topCategories = getTopCategories()
  const monthlyAverage = getMonthlyAverage()
  const highestMonth = getHighestMonth()
  const lowestMonth = getLowestMonth()

  // Generate year options (current year and past 5 years)
  const currentYear = new Date().getFullYear()
  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i)

  return (
    <div className="expense-analytics">
      <div className="analytics-header">
        <h3>Expense Analytics</h3>
        <div className="year-selector">
          <label>Year:</label>
          <select value={selectedYear} onChange={(e) => setSelectedYear(parseInt(e.target.value))}>
            {yearOptions.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="summary-cards-grid">
        <div className="stat-card">
          <div className="stat-icon">💰</div>
          <div className="stat-content">
            <div className="stat-label">Total Spent ({selectedYear})</div>
            <div className="stat-value">{formatCurrency(monthlyData?.annual_total || 0)}</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon">📊</div>
          <div className="stat-content">
            <div className="stat-label">Monthly Average</div>
            <div className="stat-value">{formatCurrency(monthlyAverage)}</div>
          </div>
        </div>

        {highestMonth && (
          <div className="stat-card">
            <div className="stat-icon">⬆️</div>
            <div className="stat-content">
              <div className="stat-label">Highest Month</div>
              <div className="stat-value">{formatCurrency(highestMonth.total)}</div>
              <div className="stat-note">{highestMonth.month_name}</div>
            </div>
          </div>
        )}

        {lowestMonth && (
          <div className="stat-card">
            <div className="stat-icon">⬇️</div>
            <div className="stat-content">
              <div className="stat-label">Lowest Month</div>
              <div className="stat-value">{formatCurrency(lowestMonth.total)}</div>
              <div className="stat-note">{lowestMonth.month_name}</div>
            </div>
          </div>
        )}
      </div>

      {detailedSummary && (
        <div className="breakdown-section">
          <h4>Spending by Type</h4>
          <div className="type-breakdown">
            {Object.entries(detailedSummary.total_by_type).map(([type, amount]) => {
              if (amount === 0) return null
              const percentage = (amount / detailedSummary.grand_total) * 100

              return (
                <div key={type} className="type-row">
                  <div className="type-info">
                    <span className="type-label">{type.replace('_', ' ')}</span>
                    <span className="type-percentage">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="type-bar-container">
                    <div
                      className="type-bar"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <span className="type-amount">{formatCurrency(amount)}</span>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {topCategories.length > 0 && (
        <div className="categories-section">
          <h4>Top Spending Categories ({selectedYear})</h4>
          <div className="categories-list">
            {topCategories.map((category, index) => {
              const percentage = (category.total / detailedSummary.grand_total) * 100

              return (
                <div key={category.name} className="category-row">
                  <div className="category-rank">#{index + 1}</div>
                  <div className="category-details">
                    <div className="category-name">{category.name}</div>
                    <div className="category-bar-container">
                      <div
                        className="category-bar"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="category-stats">
                    <div className="category-amount">{formatCurrency(category.total)}</div>
                    <div className="category-percentage">{percentage.toFixed(1)}%</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {monthlyData && (
        <div className="monthly-chart-section">
          <h4>Monthly Spending Trend</h4>
          <div className="monthly-chart">
            {monthlyData.monthly_data.map(month => {
              const maxAmount = Math.max(...monthlyData.monthly_data.map(m => m.total))
              const barHeight = maxAmount > 0 ? (month.total / maxAmount) * 100 : 0

              return (
                <div key={month.month} className="month-column">
                  <div className="month-bar-container">
                    <div
                      className="month-bar"
                      style={{ height: `${barHeight}%` }}
                      title={`${month.month_name}: ${formatCurrency(month.total)}`}
                    >
                      {month.total > 0 && (
                        <div className="bar-label">
                          {formatCurrency(month.total)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="month-label">
                    {month.month_name.substring(0, 3)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="insights-section">
        <h4>💡 Insights</h4>
        <ul>
          {monthlyAverage > 0 && (
            <li>Your average monthly spending in {selectedYear} was {formatCurrency(monthlyAverage)}</li>
          )}
          {highestMonth && lowestMonth && highestMonth.month !== lowestMonth.month && (
            <li>
              Spending varied from {formatCurrency(lowestMonth.total)} in {lowestMonth.month_name} to {formatCurrency(highestMonth.total)} in {highestMonth.month_name}
            </li>
          )}
          {topCategories.length > 0 && (
            <li>
              Your top expense category was <strong>{topCategories[0].name}</strong> at {formatCurrency(topCategories[0].total)}
            </li>
          )}
        </ul>
      </div>
    </div>
  )
}

export default ExpenseAnalytics
