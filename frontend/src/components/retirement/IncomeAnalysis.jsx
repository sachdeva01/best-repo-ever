import { formatCurrency, formatPercentage } from '../../utils/formatters'
import './IncomeAnalysis.css'

function IncomeAnalysis({ calculation }) {
  if (!calculation) return null

  const expensesAt55 = calculation.expenses_at_withdrawal_start || 0
  const netExpensesAt67 = calculation.net_expenses_with_social_security || 0
  const ssIncome = calculation.estimated_social_security_annual || 0

  const sufficientBefore = calculation.income_sufficient_before_ss
  const sufficientAfter = calculation.income_sufficient_after_ss

  return (
    <div className="income-analysis">
      <h3>Income Analysis</h3>

      <div className="analysis-sections">
        {/* Before Social Security */}
        <div className="analysis-section">
          <div className="section-header">
            <h4>Before Social Security (Ages {calculation.withdrawal_start_age}-{calculation.social_security_start_age})</h4>
            <span className={`status-badge ${sufficientBefore ? 'sufficient' : 'shortfall'}`}>
              {sufficientBefore ? '✓ Sufficient' : '⚠ Shortfall'}
            </span>
          </div>

          <div className="metric-cards">
            <div className="metric-card">
              <span className="metric-label">Annual Expenses at Age {calculation.withdrawal_start_age}</span>
              <span className="metric-value expense">{formatCurrency(expensesAt55)}</span>
            </div>
          </div>

          <div className="yield-info">
            <div className="yield-row">
              <span>Current Portfolio Yield</span>
              <span className="yield-value">
                {formatPercentage(calculation.current_portfolio_dividend_yield * 100)}
              </span>
            </div>
            <div className="yield-row required">
              <span>Required Yield at Age {calculation.withdrawal_start_age}</span>
              <span className="yield-value">
                {formatPercentage(calculation.required_dividend_yield_at_55 * 100)}
              </span>
            </div>
          </div>
        </div>

        {/* After Social Security */}
        <div className="analysis-section">
          <div className="section-header">
            <h4>After Social Security (Ages {calculation.social_security_start_age}-{calculation.target_age})</h4>
            <span className={`status-badge ${sufficientAfter ? 'sufficient' : 'shortfall'}`}>
              {sufficientAfter ? '✓ Sufficient' : '⚠ Shortfall'}
            </span>
          </div>

          <div className="metric-cards">
            <div className="metric-card">
              <span className="metric-label">Annual Expenses at Age {calculation.social_security_start_age}</span>
              <span className="metric-value expense">{formatCurrency(expensesAt55 * Math.pow(1.03, calculation.social_security_start_age - calculation.withdrawal_start_age))}</span>
            </div>

            <div className="metric-card">
              <span className="metric-label">Social Security Income</span>
              <span className="metric-value ss-income">- {formatCurrency(ssIncome)}</span>
            </div>

            <div className="metric-card highlight">
              <span className="metric-label">Net Expenses (After SS)</span>
              <span className="metric-value">{formatCurrency(netExpensesAt67)}</span>
            </div>
          </div>

          <div className="yield-info">
            <div className="yield-row">
              <span>Current Portfolio Yield</span>
              <span className="yield-value">
                {formatPercentage(calculation.current_portfolio_dividend_yield * 100)}
              </span>
            </div>
            <div className="yield-row required">
              <span>Required Yield at Age {calculation.social_security_start_age}</span>
              <span className="yield-value">
                {formatPercentage(calculation.required_dividend_yield_at_67 * 100)}
              </span>
            </div>
          </div>

          <div className="ss-impact">
            <p>
              💡 Social Security reduces your required portfolio income by{' '}
              <strong>{formatCurrency(ssIncome)}</strong> per year
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default IncomeAnalysis
