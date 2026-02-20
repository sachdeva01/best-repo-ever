import { formatCurrency } from '../../utils/formatters'
import './ExpenseSummary.css'

function ExpenseSummary({ summary }) {
  if (!summary) {
    return null
  }

  const totalAnnual = summary.total_annual_expenses || 0
  const totalMonthly = totalAnnual / 12

  return (
    <div className="expense-summary">
      <h3>Expense Summary</h3>

      <div className="summary-cards">
        <div className="summary-card primary">
          <div className="summary-icon">💰</div>
          <div className="summary-content">
            <span className="summary-label">Total Annual Expenses</span>
            <span className="summary-value">{formatCurrency(totalAnnual)}</span>
            <span className="summary-note">This is your target income from dividends/interest</span>
          </div>
        </div>

        <div className="summary-card secondary">
          <div className="summary-icon">📅</div>
          <div className="summary-content">
            <span className="summary-label">Average Monthly</span>
            <span className="summary-value">{formatCurrency(totalMonthly)}</span>
            <span className="summary-note">{formatCurrency(totalAnnual)} ÷ 12 months</span>
          </div>
        </div>
      </div>

      {summary.categories && summary.categories.length > 0 && (
        <div className="category-breakdown">
          <h4>Category Breakdown</h4>
          <div className="breakdown-list">
            {summary.categories.map((cat) => {
              const percentage = totalAnnual > 0 ? (cat.annual_amount / totalAnnual * 100) : 0
              return (
                <div key={cat.id} className="breakdown-item">
                  <div className="breakdown-info">
                    <span className="breakdown-name">{cat.name}</span>
                    <span className="breakdown-percentage">{percentage.toFixed(1)}%</span>
                  </div>
                  <div className="breakdown-bar">
                    <div
                      className="breakdown-fill"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                  <div className="breakdown-amount">
                    {formatCurrency(cat.annual_amount)}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

export default ExpenseSummary
