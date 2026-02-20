import { useRetirement } from '../hooks/useRetirement'
import RetirementProgress from '../components/retirement/RetirementProgress'
import RetirementTimeline from '../components/retirement/RetirementTimeline'
import IncomeAnalysis from '../components/retirement/IncomeAnalysis'
import './RetirementPage.css'

function RetirementPage() {
  const { calculation, config, loading, error } = useRetirement()

  return (
    <div className="retirement-page">
      <div className="page-header">
        <div>
          <h2>Retirement Planning</h2>
          <p className="page-subtitle">
            Capital preservation strategy: Live off dividends and interest while preserving principal
          </p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">Loading retirement data...</div>
      ) : calculation ? (
        <div className="retirement-content">
          <div className="retirement-grid">
            <div className="grid-item full-width">
              <RetirementTimeline calculation={calculation} />
            </div>

            <div className="grid-item">
              <RetirementProgress calculation={calculation} />
            </div>

            <div className="grid-item">
              <div className="info-card">
                <h3>📊 Strategy Overview</h3>
                <div className="strategy-points">
                  <div className="strategy-point">
                    <span className="point-icon">🎯</span>
                    <div>
                      <strong>Target Portfolio Value</strong>
                      <p>Reach ${(calculation.target_portfolio_value / 1000000).toFixed(2)}M by age {calculation.target_age}</p>
                    </div>
                  </div>
                  <div className="strategy-point">
                    <span className="point-icon">💰</span>
                    <div>
                      <strong>Income Strategy</strong>
                      <p>Live off {(calculation.required_dividend_yield_at_55 * 100).toFixed(2)}% dividend/interest income</p>
                    </div>
                  </div>
                  <div className="strategy-point">
                    <span className="point-icon">🛡️</span>
                    <div>
                      <strong>Capital Preservation</strong>
                      <p>Protect principal by not withdrawing from capital</p>
                    </div>
                  </div>
                  <div className="strategy-point">
                    <span className="point-icon">📈</span>
                    <div>
                      <strong>Inflation Protection</strong>
                      <p>{(calculation.inflation_rate * 100).toFixed(0)}% annual inflation adjustment built in</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid-item full-width">
              <IncomeAnalysis calculation={calculation} />
            </div>
          </div>
        </div>
      ) : (
        <div className="no-data">
          <p>No retirement data available. Please ensure you have:</p>
          <ul>
            <li>Created at least one brokerage account</li>
            <li>Set up your expense categories</li>
            <li>Configured your retirement settings</li>
          </ul>
        </div>
      )}
    </div>
  )
}

export default RetirementPage
