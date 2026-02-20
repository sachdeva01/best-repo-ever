import { formatCurrency, formatPercentage } from '../../utils/formatters'
import './RebalancingAnalysis.css'

function RebalancingAnalysis({ data, onRefresh }) {
  if (!data) return null

  const getStatusColor = () => {
    if (data.alignment_score >= 90) return '#48bb78'
    if (data.alignment_score >= 70) return '#ed8936'
    return '#e53e3e'
  }

  const getStatusText = () => {
    if (data.alignment_score >= 90) return 'Well Aligned'
    if (data.alignment_score >= 70) return 'Moderate Drift'
    return 'Significant Drift'
  }

  return (
    <div className="rebalancing-analysis">
      <div className="analysis-header">
        <div className="alignment-score-card">
          <div className="score-circle" style={{ borderColor: getStatusColor() }}>
            <span className="score-value" style={{ color: getStatusColor() }}>
              {data.alignment_score}
            </span>
            <span className="score-label">Alignment Score</span>
          </div>
          <div className="score-status">
            <span className="status-badge" style={{ backgroundColor: getStatusColor() }}>
              {getStatusText()}
            </span>
            {data.next_rebalance_recommended && (
              <p className="recommendation-text">
                ⚠️ Rebalancing recommended to improve alignment
              </p>
            )}
          </div>
        </div>

        <div className="portfolio-value-card">
          <span className="portfolio-label">Total Portfolio Value</span>
          <span className="portfolio-value">
            {formatCurrency(data.rebalancing_trades.total_portfolio_value)}
          </span>
        </div>
      </div>

      <div className="allocation-comparison">
        <h3>Current vs Target Allocation</h3>
        <div className="allocation-grid">
          {Object.entries(data.current_allocation.allocations).map(([category, details]) => {
            const deviation = (details.current_percentage - details.target_percentage) * 100
            const isOverweight = deviation > 0
            const isSignificant = Math.abs(deviation) > 5

            return (
              <div key={category} className={`allocation-item ${isSignificant ? 'significant-deviation' : ''}`}>
                <div className="allocation-header">
                  <h4>{category}</h4>
                  {isSignificant && (
                    <span className={`deviation-badge ${isOverweight ? 'overweight' : 'underweight'}`}>
                      {isOverweight ? 'Overweight' : 'Underweight'}
                    </span>
                  )}
                </div>

                <div className="allocation-bars">
                  <div className="allocation-bar-row">
                    <span className="bar-label">Current</span>
                    <div className="bar-container">
                      <div
                        className="bar-fill current"
                        style={{ width: `${details.current_percentage * 100}%` }}
                      ></div>
                    </div>
                    <span className="bar-value">{formatPercentage(details.current_percentage * 100, 1)}</span>
                  </div>

                  <div className="allocation-bar-row">
                    <span className="bar-label">Target</span>
                    <div className="bar-container">
                      <div
                        className="bar-fill target"
                        style={{ width: `${details.target_percentage * 100}%` }}
                      ></div>
                    </div>
                    <span className="bar-value">{formatPercentage(details.target_percentage * 100, 1)}</span>
                  </div>
                </div>

                <div className="allocation-values">
                  <span>Current: {formatCurrency(details.current_value)}</span>
                  <span className="deviation">
                    {deviation > 0 ? '+' : ''}{formatPercentage(deviation, 1)} deviation
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="rebalancing-trades">
        <h3>Recommended Trades</h3>
        <div className="trades-summary">
          <div className="summary-stat">
            <span className="stat-label">Total Trades</span>
            <span className="stat-value">{data.rebalancing_trades.summary.total_trades}</span>
          </div>
          <div className="summary-stat buy">
            <span className="stat-label">Total Buy Amount</span>
            <span className="stat-value">{formatCurrency(data.rebalancing_trades.summary.total_buy_amount)}</span>
          </div>
          <div className="summary-stat sell">
            <span className="stat-label">Total Sell Amount</span>
            <span className="stat-value">{formatCurrency(data.rebalancing_trades.summary.total_sell_amount)}</span>
          </div>
        </div>

        {data.rebalancing_trades.trades.length > 0 ? (
          <div className="trades-list">
            {data.rebalancing_trades.trades.map((trade, index) => (
              <div key={index} className={`trade-card priority-${trade.priority.toLowerCase()}`}>
                <div className="trade-header">
                  <span className={`trade-action ${trade.action.toLowerCase()}`}>
                    {trade.action}
                  </span>
                  <span className="trade-category">{trade.category}</span>
                  <span className={`trade-priority ${trade.priority.toLowerCase()}`}>
                    {trade.priority} Priority
                  </span>
                </div>

                <div className="trade-amount">
                  <span className="amount-label">Amount</span>
                  <span className="amount-value">{formatCurrency(trade.amount)}</span>
                </div>

                <div className="trade-details">
                  <div className="detail-row">
                    <span>Current Value:</span>
                    <span>{formatCurrency(trade.current_value)}</span>
                  </div>
                  <div className="detail-row">
                    <span>Target Value:</span>
                    <span>{formatCurrency(trade.target_value)}</span>
                  </div>
                  <div className="detail-row">
                    <span>Difference:</span>
                    <span className={trade.action === 'BUY' ? 'positive' : 'negative'}>
                      {formatPercentage(Math.abs(trade.difference_percentage), 1)} of portfolio
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="no-trades">
            <p>✓ Portfolio is well balanced. No significant trades needed at this time.</p>
          </div>
        )}
      </div>

      <div className="rebalancing-tips">
        <h4>💡 Rebalancing Tips</h4>
        <ul>
          <li>Rebalance during low-volatility periods to minimize transaction costs</li>
          <li>Consider tax implications when selling appreciated assets in taxable accounts</li>
          <li>Use new contributions to buy underweight categories without selling</li>
          <li>Review and rebalance quarterly, or when allocation drifts more than 5%</li>
        </ul>
      </div>
    </div>
  )
}

export default RebalancingAnalysis
