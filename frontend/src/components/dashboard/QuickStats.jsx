import { formatCurrency, formatPercentage } from '../../utils/formatters'
import Tooltip from '../common/Tooltip'
import './QuickStats.css'

function QuickStats({ stats, expectedReturns }) {
  if (!stats) return null

  const statCards = [
    {
      label: 'Current Net Worth',
      value: formatCurrency(stats.total_net_worth || 0),
      subLabel: stats.projected_net_worth_at_withdrawal ? `At age 55: ${formatCurrency(stats.projected_net_worth_at_withdrawal)}` : null,
      icon: '💰',
      color: 'blue',
      tooltip: stats.projected_net_worth_at_withdrawal ? 'Projected value in 4 years: Starting balance + 6% annual growth + $20K/year reinvested from surplus + $250K one-time contribution' : null
    },
    {
      label: 'Annual Income (Pre-Tax)',
      value: formatCurrency(stats.annual_dividend_income || 0),
      subLabel: stats.after_tax_annual_income ? `After-Tax: ${formatCurrency(stats.after_tax_annual_income)}` : null,
      icon: '📈',
      color: 'green'
    },
    {
      label: 'Total Annual Expenses',
      value: formatCurrency(stats.total_annual_expenses || 0),
      icon: '💳',
      color: 'red'
    },
    {
      label: 'Expected Growth Rate',
      value: expectedReturns ? formatPercentage(expectedReturns.expected_growth_rate * 100) : 'N/A',
      subLabel: 'Based on market conditions',
      icon: '📊',
      color: 'teal',
      tooltip: 'Expected portfolio growth rate calculated using current 10-Year Treasury yield (risk-free rate) + equity risk premium, weighted by your target asset allocation (52% equities, 48% fixed income).'
    },
    {
      label: 'Progress to Target',
      value: formatPercentage(stats.progress_to_target_percentage || 0, 1),
      icon: '🎯',
      color: 'purple'
    },
    {
      label: 'Years to Withdrawal',
      value: stats.years_to_withdrawal || 0,
      icon: '⏰',
      color: 'orange'
    }
  ]

  return (
    <div className="quick-stats">
      {statCards.map((card, index) => (
        <div key={index} className={`stat-card ${card.color}`}>
          <div className="stat-icon">{card.icon}</div>
          <div className="stat-content">
            <span className="stat-label">
              {card.label}
              {card.tooltip && (
                <Tooltip content={card.tooltip}>
                  <span className="info-icon">ℹ️</span>
                </Tooltip>
              )}
            </span>
            <span className="stat-value">{card.value}</span>
            {card.subLabel && <span className="stat-sublabel">{card.subLabel}</span>}
          </div>
        </div>
      ))}
    </div>
  )
}

export default QuickStats
