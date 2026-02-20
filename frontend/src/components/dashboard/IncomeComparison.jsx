import { formatCurrency, formatPercentage } from '../../utils/formatters'
import './IncomeComparison.css'

function IncomeComparison({ comparison, expectedReturns }) {
  if (!comparison || !expectedReturns) return null

  const getStatusColor = () => {
    if (comparison.status === "On Track") return '#48bb78'
    if (comparison.status === "Below Target") return '#ed8936'
    return '#e53e3e'
  }

  return (
    <div className="income-comparison">
      <h3>Income Analysis: Current vs Expected</h3>

      <div className="comparison-header">
        <div className={`status-indicator ${comparison.status.toLowerCase().replace(' ', '-')}`}>
          <span className="status-icon">
            {comparison.status === "On Track" ? "✓" : comparison.status === "Below Target" ? "⚠" : "⚠"}
          </span>
          <span className="status-text">{comparison.status}</span>
        </div>
        <div className="progress-bar-container">
          <div
            className="progress-bar-fill"
            style={{
              width: `${Math.min(comparison.progress_to_target_percentage, 100)}%`,
              backgroundColor: getStatusColor()
            }}
          ></div>
        </div>
        <span className="progress-text">
          {formatPercentage(comparison.progress_to_target_percentage, 1)} of Target
        </span>
      </div>

      <div className="comparison-grid">
        <div className="comparison-section current">
          <h4>Current (Actual Holdings)</h4>
          <div className="metric-large">
            <span className="metric-label">Annual Income (Pre-Tax)</span>
            <span className="metric-value">{formatCurrency(comparison.current_annual_income)}</span>
          </div>
          {comparison.current_after_tax_income !== undefined && (
            <div className="metric-medium">
              <span className="metric-label">After-Tax Income</span>
              <span className="metric-value after-tax">{formatCurrency(comparison.current_after_tax_income)}</span>
            </div>
          )}
          <div className="metric-small">
            <span className="metric-label">Portfolio Yield</span>
            <span className="metric-value">{formatPercentage(comparison.current_yield * 100)}</span>
          </div>
        </div>

        <div className="comparison-arrow">
          <span>→</span>
          <div className="gap-labels">
            <span className="gap-label">
              Pre-Tax Gap: {formatCurrency(Math.abs(comparison.income_gap))}
            </span>
            {comparison.after_tax_income_gap !== undefined && (
              <span className="gap-label after-tax">
                After-Tax Gap: {formatCurrency(Math.abs(comparison.after_tax_income_gap))}
              </span>
            )}
          </div>
        </div>

        <div className="comparison-section expected">
          <h4>Expected (Optimal Allocation)</h4>
          <div className="metric-large">
            <span className="metric-label">Annual Income (Pre-Tax)</span>
            <span className="metric-value">{formatCurrency(comparison.expected_annual_income)}</span>
          </div>
          {comparison.expected_after_tax_income !== undefined && (
            <div className="metric-medium">
              <span className="metric-label">After-Tax Income ({comparison.tax_rate}% tax)</span>
              <span className="metric-value after-tax">{formatCurrency(comparison.expected_after_tax_income)}</span>
            </div>
          )}
          <div className="metric-small">
            <span className="metric-label">Portfolio Yield</span>
            <span className="metric-value">{formatPercentage(comparison.expected_yield * 100)}</span>
          </div>
        </div>
      </div>

      <div className="market-context">
        <div className="context-item">
          <span className="context-icon">📊</span>
          <div className="context-content">
            <strong>Expected Growth Rate</strong>
            <span>{formatPercentage(expectedReturns.expected_growth_rate * 100)} annually</span>
            <small>Based on current market conditions</small>
          </div>
        </div>
        <div className="context-item">
          <span className="context-icon">📈</span>
          <div className="context-content">
            <strong>10-Year Treasury</strong>
            <span>{formatPercentage(expectedReturns.current_treasury_yield * 100)}</span>
            <small>Risk-free rate baseline</small>
          </div>
        </div>
      </div>

      <div className="allocation-note">
        <p>
          💡 <strong>Expected returns</strong> are calculated using the target asset allocation strategy
          (30% Dividend Growth Stocks, 20% High-Yield Bonds, 10% REITs, 15% Treasury/TIPS,
          5% Preferred Stock, 8% Cash, 12% Growth Equities) adjusted for current market conditions.
        </p>
      </div>
    </div>
  )
}

export default IncomeComparison
