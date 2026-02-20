import { formatCurrency } from '../../utils/formatters'
import './PortfolioRecommendations.css'

function PortfolioRecommendations({ data, onRefresh }) {
  if (!data) return null

  return (
    <div className="portfolio-recommendations">
      <div className="recommendations-summary">
        <h3>Recommendations Summary</h3>
        <div className="summary-cards">
          <div className="summary-card">
            <span className="card-icon">📋</span>
            <div className="card-content">
              <span className="card-value">{data.summary.total_recommendations}</span>
              <span className="card-label">Total Recommendations</span>
            </div>
          </div>
          <div className="summary-card high-priority">
            <span className="card-icon">🔴</span>
            <div className="card-content">
              <span className="card-value">{data.summary.high_priority}</span>
              <span className="card-label">High Priority</span>
            </div>
          </div>
          <div className="summary-card medium-priority">
            <span className="card-icon">🟠</span>
            <div className="card-content">
              <span className="card-value">{data.summary.medium_priority}</span>
              <span className="card-label">Medium Priority</span>
            </div>
          </div>
          <div className="summary-card income-increase">
            <span className="card-icon">💰</span>
            <div className="card-content">
              <span className="card-value">{formatCurrency(data.summary.expected_annual_income_increase)}</span>
              <span className="card-label">Expected Income Increase</span>
            </div>
          </div>
        </div>
      </div>

      <div className="recommendations-list">
        <h3>Actionable Recommendations</h3>
        {data.recommendations.length > 0 ? (
          <div className="recommendations-grid">
            {data.recommendations.map((rec, index) => (
              <div key={index} className={`recommendation-card priority-${rec.priority.toLowerCase()}`}>
                <div className="rec-header">
                  <span className={`rec-action ${rec.action.toLowerCase()}`}>
                    {rec.action}
                  </span>
                  <span className="rec-category">{rec.category}</span>
                </div>

                <div className="rec-amount">
                  <span className="amount-label">Recommended Amount</span>
                  <span className="amount-value">{formatCurrency(rec.amount)}</span>
                </div>

                <div className="rec-priority-badge">
                  <span className={`priority-dot ${rec.priority.toLowerCase()}`}></span>
                  {rec.priority} Priority
                </div>

                <div className="rec-reason">
                  <p>{rec.reason}</p>
                </div>

                {rec.expected_yield_improvement > 0 && (
                  <div className="yield-improvement">
                    <span className="improvement-icon">📈</span>
                    <span className="improvement-text">
                      Expected annual income increase: <strong>{formatCurrency(rec.expected_yield_improvement)}</strong>
                    </span>
                  </div>
                )}

                {rec.suggestions && rec.suggestions.length > 0 && (
                  <div className="rec-suggestions">
                    <h5>Suggested ETFs/Funds:</h5>
                    <ul>
                      {rec.suggestions.map((suggestion, idx) => (
                        <li key={idx}>{suggestion}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {rec.description && (
                  <div className="rec-description">
                    <p><strong>Strategy:</strong> {rec.description}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-recommendations">
            <span className="no-rec-icon">✓</span>
            <p>Your portfolio is well balanced. No immediate actions needed.</p>
          </div>
        )}
      </div>

      <div className="implementation-guide">
        <h3>🎯 Implementation Guide</h3>
        <div className="guide-steps">
          <div className="guide-step">
            <span className="step-number">1</span>
            <div className="step-content">
              <h4>Start with High Priority</h4>
              <p>Address high-priority recommendations first, as these have the most significant impact on your portfolio alignment and income generation.</p>
            </div>
          </div>
          <div className="guide-step">
            <span className="step-number">2</span>
            <div className="step-content">
              <h4>Dollar-Cost Average</h4>
              <p>For large purchases, consider spreading them over 2-3 months to reduce timing risk. For example, if buying $50K, invest $16-17K per month.</p>
            </div>
          </div>
          <div className="guide-step">
            <span className="step-number">3</span>
            <div className="step-content">
              <h4>Consider Tax Impact</h4>
              <p>In taxable accounts, prioritize tax-efficient ETFs and be mindful of capital gains. Use tax-advantaged accounts (IRA, 401k) for high-turnover or high-income investments.</p>
            </div>
          </div>
          <div className="guide-step">
            <span className="step-number">4</span>
            <div className="step-content">
              <h4>Track and Review</h4>
              <p>After implementing changes, monitor your portfolio for 3-6 months. Track actual income vs expected, and rebalance quarterly or when allocation drifts more than 5%.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="disclaimer">
        <p><strong>⚠️ Disclaimer:</strong> These recommendations are based on mathematical optimization and do not constitute personalized investment advice. Consider your risk tolerance, time horizon, and tax situation. Consult with a licensed financial advisor before making significant investment decisions.</p>
      </div>
    </div>
  )
}

export default PortfolioRecommendations
