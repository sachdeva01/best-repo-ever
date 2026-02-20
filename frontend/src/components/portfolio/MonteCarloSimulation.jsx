import { useState, useEffect } from 'react'
import { fetchMonteCarloSimulation } from '../../api/monteCarlo'
import './MonteCarloSimulation.css'

function MonteCarloSimulation() {
  const [simulation, setSimulation] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [numSimulations, setNumSimulations] = useState(1000)

  useEffect(() => {
    loadSimulation()
  }, [])

  const loadSimulation = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await fetchMonteCarloSimulation(numSimulations)
      setSimulation(data)
    } catch (err) {
      setError(err.message || 'Failed to load Monte Carlo simulation')
      console.error('Error loading simulation:', err)
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

  const formatPercentage = (value) => {
    return `${value.toFixed(2)}%`
  }

  if (loading) {
    return <div className="loading">Running Monte Carlo simulation...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  if (!simulation) {
    return <div className="error">No simulation data available</div>
  }

  // Get key milestone years
  const milestoneYears = [0, 4, 10, 20, 30, simulation.years - 1].filter(y => y < simulation.years)

  return (
    <div className="monte-carlo-simulation">
      <div className="simulation-header">
        <h3>Monte Carlo Retirement Simulation</h3>
        <p>Based on {simulation.num_simulations.toLocaleString()} random market scenarios</p>
      </div>

      <div className="success-rate-card">
        <div className="success-rate-content">
          <div className="success-rate-label">Success Rate</div>
          <div className={`success-rate-value ${simulation.success_rate >= 90 ? 'high' : simulation.success_rate >= 70 ? 'medium' : 'low'}`}>
            {formatPercentage(simulation.success_rate)}
          </div>
          <div className="success-rate-description">
            {simulation.success_rate >= 90 && '✓ Excellent - Portfolio highly likely to last through retirement'}
            {simulation.success_rate >= 70 && simulation.success_rate < 90 && '⚠️ Good - Portfolio likely to last, consider adjustments'}
            {simulation.success_rate < 70 && '✗ Concerning - High risk of running out of money'}
          </div>
        </div>
      </div>

      <div className="simulation-grid">
        <div className="final-value-card">
          <h4>Final Portfolio Value at Age {simulation.parameters.starting_portfolio ? 90 : 'Target'}</h4>
          <div className="stats-table">
            <div className="stat-row">
              <span className="stat-label">Best Case (90th percentile):</span>
              <span className="stat-value">{formatCurrency(simulation.final_value_stats.p90)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Above Average (75th):</span>
              <span className="stat-value">{formatCurrency(simulation.final_value_stats.max)}</span>
            </div>
            <div className="stat-row highlight">
              <span className="stat-label">Median (50th):</span>
              <span className="stat-value">{formatCurrency(simulation.final_value_stats.median)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Below Average (25th):</span>
              <span className="stat-value">{formatCurrency(simulation.final_value_stats.min)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Worst Case (10th percentile):</span>
              <span className="stat-value">{formatCurrency(simulation.final_value_stats.p10)}</span>
            </div>
            <div className="stat-row">
              <span className="stat-label">Average:</span>
              <span className="stat-value">{formatCurrency(simulation.final_value_stats.mean)}</span>
            </div>
          </div>
        </div>

        <div className="parameters-card">
          <h4>Simulation Parameters</h4>
          <div className="params-grid">
            <div className="param-item">
              <span className="param-label">Starting Portfolio:</span>
              <span className="param-value">{formatCurrency(simulation.parameters.starting_portfolio)}</span>
            </div>
            <div className="param-item">
              <span className="param-label">Expected Return:</span>
              <span className="param-value">{formatPercentage(simulation.parameters.expected_return * 100)}</span>
            </div>
            <div className="param-item">
              <span className="param-label">Market Volatility:</span>
              <span className="param-value">{formatPercentage(simulation.parameters.volatility * 100)}</span>
            </div>
            <div className="param-item">
              <span className="param-label">Inflation Rate:</span>
              <span className="param-value">{formatPercentage(simulation.parameters.inflation_rate * 100)}</span>
            </div>
            <div className="param-item">
              <span className="param-label">Annual Expenses:</span>
              <span className="param-value">{formatCurrency(simulation.parameters.annual_expenses)}</span>
            </div>
            <div className="param-item">
              <span className="param-label">Annual Reinvestment:</span>
              <span className="param-value">{formatCurrency(simulation.parameters.annual_reinvestment)}</span>
            </div>
            <div className="param-item">
              <span className="param-label">One-time Contribution:</span>
              <span className="param-value">{formatCurrency(simulation.parameters.one_time_contribution)}</span>
            </div>
            <div className="param-item">
              <span className="param-label">Tax Rate:</span>
              <span className="param-value">{formatPercentage(simulation.parameters.tax_rate * 100)}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="percentiles-table-card">
        <h4>Portfolio Value Distribution Over Time</h4>
        <p className="table-description">Shows portfolio value at different probability levels for key milestone years</p>
        <div className="table-scroll">
          <table className="percentiles-table">
            <thead>
              <tr>
                <th>Year</th>
                <th>Age</th>
                <th>10th Percentile</th>
                <th>25th Percentile</th>
                <th className="highlight-col">Median (50th)</th>
                <th>75th Percentile</th>
                <th>90th Percentile</th>
                <th>Mean</th>
              </tr>
            </thead>
            <tbody>
              {simulation.percentiles_by_year
                .filter((p) => milestoneYears.includes(p.year))
                .map((p) => (
                  <tr key={p.year}>
                    <td>{p.year}</td>
                    <td>{p.age}</td>
                    <td>{formatCurrency(p.p10)}</td>
                    <td>{formatCurrency(p.p25)}</td>
                    <td className="highlight-col">{formatCurrency(p.p50)}</td>
                    <td>{formatCurrency(p.p75)}</td>
                    <td>{formatCurrency(p.p90)}</td>
                    <td>{formatCurrency(p.mean)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="interpretation-card">
        <h4>📊 How to Read This Analysis</h4>
        <div className="interpretation-content">
          <div className="interpretation-item">
            <strong>Success Rate:</strong> Percentage of simulations where portfolio lasted through age 90.
            Higher is better (aim for 80%+).
          </div>
          <div className="interpretation-item">
            <strong>Percentiles:</strong> In 50% of scenarios, your portfolio will be worth more than the median value.
            The 10th percentile shows worst-case scenarios; 90th shows best-case.
          </div>
          <div className="interpretation-item">
            <strong>Market Volatility:</strong> Simulations account for market ups and downs (15% standard deviation).
            This is more realistic than assuming constant returns.
          </div>
          <div className="interpretation-item">
            <strong>What This Means:</strong> If median final value is high and success rate is 80%+,
            your plan is robust against market volatility. If success rate is low, consider reducing expenses
            or increasing contributions.
          </div>
        </div>
      </div>
    </div>
  )
}

export default MonteCarloSimulation
