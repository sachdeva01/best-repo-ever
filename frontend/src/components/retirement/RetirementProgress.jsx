import { formatCurrency, formatPercentage } from '../../utils/formatters'
import './RetirementProgress.css'

function RetirementProgress({ calculation }) {
  if (!calculation) return null

  const progress = calculation.progress_to_target_percentage || 0
  const current = calculation.current_net_worth || 0
  const target = calculation.target_portfolio_value || 0
  const gap = calculation.gap_to_target || 0

  const getProgressColor = () => {
    if (progress >= 80) return '#48bb78' // green
    if (progress >= 50) return '#ed8936' // orange
    return '#e53e3e' // red
  }

  const getStatusText = () => {
    if (progress >= 80) return 'Excellent Progress'
    if (progress >= 50) return 'On Track'
    return 'Needs Attention'
  }

  return (
    <div className="retirement-progress">
      <h3>Progress to Target Portfolio</h3>

      <div className="progress-circle-container">
        <svg className="progress-circle" width="200" height="200">
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            stroke="#e2e8f0"
            strokeWidth="12"
          />
          <circle
            cx="100"
            cy="100"
            r="85"
            fill="none"
            stroke={getProgressColor()}
            strokeWidth="12"
            strokeDasharray={`${2 * Math.PI * 85}`}
            strokeDashoffset={`${2 * Math.PI * 85 * (1 - progress / 100)}`}
            strokeLinecap="round"
            transform="rotate(-90 100 100)"
          />
        </svg>
        <div className="progress-text">
          <span className="progress-percentage" style={{ color: getProgressColor() }}>
            {formatPercentage(progress, 1)}
          </span>
          <span className="progress-status">{getStatusText()}</span>
        </div>
      </div>

      <div className="progress-details">
        <div className="detail-row">
          <span className="detail-label">Current Net Worth</span>
          <span className="detail-value">{formatCurrency(current)}</span>
        </div>
        <div className="detail-row">
          <span className="detail-label">Target at Age {calculation.target_age}</span>
          <span className="detail-value">{formatCurrency(target)}</span>
        </div>
        <div className="detail-row highlight">
          <span className="detail-label">Gap to Target</span>
          <span className="detail-value">{formatCurrency(gap)}</span>
        </div>
        {calculation.required_annual_growth_rate && (
          <div className="detail-row">
            <span className="detail-label">Required Annual Growth</span>
            <span className="detail-value">
              {formatPercentage(calculation.required_annual_growth_rate)}
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

export default RetirementProgress
