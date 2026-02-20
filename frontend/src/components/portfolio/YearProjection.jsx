import { useState, useEffect } from 'react'
import { fetchYearProjection } from '../../api/yearProjection'
import './YearProjection.css'

function YearProjection() {
  const [projection, setProjection] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadProjection()
  }, [])

  const loadProjection = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchYearProjection()
      setProjection(data)
    } catch (err) {
      setError(err.message || 'Failed to load year projection')
      console.error('Error loading projection:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  if (loading) {
    return <div className="loading">Loading year-by-year projection...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  if (!projection || !projection.projections) {
    return <div className="error">No projection data available</div>
  }

  return (
    <div className="year-projection">
      <div className="projection-header">
        <h3>Year-by-Year Retirement Projection</h3>
        <p>Detailed income, expense, and portfolio projections from age {projection.projections[0]?.age} to {projection.projections[projection.projections.length - 1]?.age}</p>
      </div>

      {projection.summary && (
        <div className="summary-cards">
          <div className="summary-card">
            <div className="summary-label">Starting Portfolio</div>
            <div className="summary-value">{formatCurrency(projection.summary.starting_portfolio)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Ending Portfolio (Age 90)</div>
            <div className={`summary-value ${projection.summary.success ? 'positive' : 'negative'}`}>
              {formatCurrency(projection.summary.ending_portfolio)}
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Peak Portfolio</div>
            <div className="summary-value">{formatCurrency(projection.summary.peak_portfolio)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Contributions</div>
            <div className="summary-value">{formatCurrency(projection.summary.total_contributions)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Income (Withdrawal Phase)</div>
            <div className="summary-value">{formatCurrency(projection.summary.total_income_generated)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Expenses (Withdrawal Phase)</div>
            <div className="summary-value">{formatCurrency(projection.summary.total_expenses)}</div>
          </div>
          <div className={`summary-card status ${projection.summary.success ? 'success' : 'warning'}`}>
            <div className="summary-label">Plan Status</div>
            <div className="summary-value">
              {projection.summary.success ? '✓ Success' : '✗ Deficit'}
            </div>
          </div>
        </div>
      )}

      <div className="projection-table-card">
        <h4>Detailed Year-by-Year Breakdown</h4>
        <div className="table-scroll">
          <table className="projection-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Age</th>
                <th>Phase</th>
                <th>Portfolio Value</th>
                <th>Income (Pre-Tax)</th>
                <th>Income (After-Tax)</th>
                <th>SS Income</th>
                <th>Total Income</th>
                <th>Expenses</th>
                <th>Net Expenses</th>
                <th>Contribution</th>
                <th>Reinvestment</th>
                <th>Net Surplus</th>
                <th>Milestone</th>
              </tr>
            </thead>
            <tbody>
              {projection.projections.map((p) => (
                <tr
                  key={p.year}
                  className={`
                    ${p.milestone ? 'milestone-row' : ''}
                    ${p.surplus_deficit < 0 ? 'deficit-row' : ''}
                  `}
                >
                  <td>{p.year}</td>
                  <td>{p.age}</td>
                  <td>
                    <span className={`phase-badge ${p.phase.toLowerCase()}`}>
                      {p.phase}
                    </span>
                  </td>
                  <td className="currency">{formatCurrency(p.portfolio_value)}</td>
                  <td className="currency">{formatCurrency(p.portfolio_income_pretax)}</td>
                  <td className="currency">{formatCurrency(p.portfolio_income_aftertax)}</td>
                  <td className="currency">{formatCurrency(p.social_security_income)}</td>
                  <td className="currency highlight">{formatCurrency(p.total_income_aftertax)}</td>
                  <td className="currency">{formatCurrency(p.expenses)}</td>
                  <td className="currency">{formatCurrency(p.net_expenses)}</td>
                  <td className="currency">{formatCurrency(p.contribution)}</td>
                  <td className="currency positive">{formatCurrency(p.reinvestment)}</td>
                  <td className={`currency ${p.surplus_deficit >= 0 ? 'positive' : 'negative'}`}>
                    {formatCurrency(p.surplus_deficit)}
                  </td>
                  <td className="milestone">{p.milestone || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {projection.assumptions && (
        <div className="assumptions-card">
          <h4>📋 Projection Assumptions</h4>
          <div className="assumptions-grid">
            <div className="assumption-item">
              <span className="assumption-label">Expected Return:</span>
              <span className="assumption-value">{(projection.assumptions.expected_return * 100).toFixed(2)}%</span>
            </div>
            <div className="assumption-item">
              <span className="assumption-label">Expected Yield:</span>
              <span className="assumption-value">{(projection.assumptions.expected_yield * 100).toFixed(2)}%</span>
            </div>
            <div className="assumption-item">
              <span className="assumption-label">Inflation Rate:</span>
              <span className="assumption-value">{(projection.assumptions.inflation_rate * 100).toFixed(2)}%</span>
            </div>
            <div className="assumption-item">
              <span className="assumption-label">Tax Rate:</span>
              <span className="assumption-value">{(projection.assumptions.tax_rate * 100).toFixed(2)}%</span>
            </div>
            <div className="assumption-item">
              <span className="assumption-label">Annual Reinvestment:</span>
              <span className="assumption-value">{formatCurrency(projection.assumptions.annual_reinvestment)}</span>
            </div>
            <div className="assumption-item">
              <span className="assumption-label">One-time Contribution:</span>
              <span className="assumption-value">{formatCurrency(projection.assumptions.one_time_contribution)}</span>
            </div>
          </div>
        </div>
      )}

      <div className="interpretation-card">
        <h4>📊 How to Read This Table</h4>
        <div className="interpretation-content">
          <div className="interpretation-item">
            <strong>Accumulation Phase (Age 51-54):</strong> Building wealth through $250K one-time contribution at age 54.
            Portfolio grows through market returns (6% annually). All income stays in portfolio.
          </div>
          <div className="interpretation-item">
            <strong>Withdrawal Phase (Age 55+):</strong> Living off portfolio income (4.31% yield) and Social Security (starting age 67).
            When there's surplus income, $20K is reinvested annually back into portfolio. Net Surplus shows remaining after reinvestment.
            Negative values mean withdrawing from principal.
          </div>
          <div className="interpretation-item">
            <strong>Social Security Impact (Age 67+):</strong> SS income reduces required portfolio withdrawals.
            Net Expenses = Total Expenses - Social Security Income.
          </div>
          <div className="interpretation-item">
            <strong>Key Metrics:</strong> Watch for sustained deficits (red values) which deplete principal.
            Portfolio Value should ideally grow or stay stable through age 90.
          </div>
        </div>
      </div>
    </div>
  )
}

export default YearProjection
