import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { formatCurrency, formatPercentage } from '../../utils/formatters'
import { analyzeScenario, fetchCrisisScenario } from '../../api/scenario'
import './ScenarioPlanner.css'

function ScenarioPlanner({ presets }) {
  const [selectedPreset, setSelectedPreset] = useState('')
  const [scenarioInput, setScenarioInput] = useState({})
  const [scenarioResult, setScenarioResult] = useState(null)
  const [error, setError] = useState(null)

  const analyzeMutation = useMutation({
    mutationFn: (input) => analyzeScenario(input),
    onSuccess: (result) => {
      setScenarioResult(result)
      setError(null)
    },
    onError: (err) => {
      setError(err.message || 'Failed to analyze scenario. Please try again.')
      setScenarioResult(null)
    },
  })

  const loading = analyzeMutation.isPending

  const handlePresetSelect = (presetName) => {
    setSelectedPreset(presetName)
    const preset = presets.find(p => p.name === presetName)
    if (preset) {
      setScenarioInput(preset.scenario)
    }
  }

  const handleInputChange = (field, value) => {
    setScenarioInput(prev => ({
      ...prev,
      [field]: value === '' ? null : parseFloat(value)
    }))
  }

  const handleAnalyze = () => {
    analyzeMutation.mutate(scenarioInput)
  }

  const handleReset = () => {
    setSelectedPreset('')
    setScenarioInput({})
    setScenarioResult(null)
    setError(null)
  }

  const [crisisResult, setCrisisResult] = useState(null)

  const crisisMutation = useMutation({
    mutationFn: fetchCrisisScenario,
    onSuccess: (result) => setCrisisResult(result),
  })

  const getSuccessColor = (score) => {
    if (score >= 80) return '#48bb78'
    if (score >= 60) return '#ed8936'
    return '#e53e3e'
  }

  return (
    <div className="scenario-planner">
      <div className="scenario-presets">
        <h3>Quick Scenarios</h3>
        <div className="presets-grid">
          {presets && presets.map(preset => (
            <button
              key={preset.name}
              className={`preset-button ${selectedPreset === preset.name ? 'active' : ''}`}
              onClick={() => handlePresetSelect(preset.name)}
            >
              <span className="preset-icon">{preset.name.includes('Conservative') ? '🛡️' : preset.name.includes('Optimistic') ? '📈' : preset.name.includes('Earlier') ? '⏰' : preset.name.includes('Later') ? '⏳' : preset.name.includes('Higher') ? '💰' : '💵'}</span>
              <span className="preset-name">{preset.name}</span>
              <p className="preset-description">{preset.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="scenario-inputs">
        <h3>Custom Scenario Parameters</h3>
        <div className="inputs-grid">
          <div className="input-group">
            <label>Portfolio Value</label>
            <input
              type="number"
              placeholder="Current value"
              value={scenarioInput.portfolio_value || ''}
              onChange={(e) => handleInputChange('portfolio_value', e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Portfolio Yield (%)</label>
            <input
              type="number"
              step="0.1"
              placeholder="Expected yield"
              value={scenarioInput.portfolio_yield || ''}
              onChange={(e) => handleInputChange('portfolio_yield', e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Growth Rate (%)</label>
            <input
              type="number"
              step="0.1"
              placeholder="Annual growth"
              value={scenarioInput.portfolio_growth_rate || ''}
              onChange={(e) => handleInputChange('portfolio_growth_rate', e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Current Age</label>
            <input
              type="number"
              placeholder="Your age"
              value={scenarioInput.current_age || ''}
              onChange={(e) => handleInputChange('current_age', e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Withdrawal Start Age</label>
            <input
              type="number"
              placeholder="Retire at"
              value={scenarioInput.withdrawal_start_age || ''}
              onChange={(e) => handleInputChange('withdrawal_start_age', e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Social Security Age</label>
            <input
              type="number"
              placeholder="SS starts at"
              value={scenarioInput.social_security_start_age || ''}
              onChange={(e) => handleInputChange('social_security_start_age', e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Target Age</label>
            <input
              type="number"
              placeholder="Plan until"
              value={scenarioInput.target_age || ''}
              onChange={(e) => handleInputChange('target_age', e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Target Portfolio Value</label>
            <input
              type="number"
              placeholder="Goal at target age"
              value={scenarioInput.target_portfolio_value || ''}
              onChange={(e) => handleInputChange('target_portfolio_value', e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Annual Expenses</label>
            <input
              type="number"
              placeholder="Yearly expenses"
              value={scenarioInput.annual_expenses || ''}
              onChange={(e) => handleInputChange('annual_expenses', e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Target Gross Income</label>
            <input
              type="number"
              placeholder="Target gross income"
              value={scenarioInput.target_gross_income || ''}
              onChange={(e) => handleInputChange('target_gross_income', e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Blended Tax Rate (%)</label>
            <input
              type="number"
              step="0.1"
              placeholder="Tax rate"
              value={scenarioInput.blended_tax_rate ? scenarioInput.blended_tax_rate * 100 : ''}
              onChange={(e) => handleInputChange('blended_tax_rate', e.target.value ? parseFloat(e.target.value) / 100 : null)}
            />
          </div>

          <div className="input-group">
            <label>Social Security (Monthly)</label>
            <input
              type="number"
              placeholder="Monthly benefit"
              value={scenarioInput.social_security_monthly || ''}
              onChange={(e) => handleInputChange('social_security_monthly', e.target.value)}
            />
          </div>

          <div className="input-group">
            <label>Inflation Rate (%)</label>
            <input
              type="number"
              step="0.1"
              placeholder="Annual inflation"
              value={scenarioInput.inflation_rate || ''}
              onChange={(e) => handleInputChange('inflation_rate', e.target.value)}
            />
          </div>
        </div>

        <div className="scenario-actions">
          <button className="analyze-button" onClick={handleAnalyze} disabled={loading}>
            {loading ? 'Analyzing...' : '🎯 Analyze Scenario'}
          </button>
          <button className="reset-button" onClick={handleReset}>
            Reset
          </button>
        </div>

        {error && (
          <div className="error-message" style={{
            marginTop: '1rem',
            padding: '1rem',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '4px',
            color: '#c00'
          }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {scenarioResult && (
        <div className="scenario-results">
          <h3>Scenario Analysis Results</h3>

          <div className="results-header">
            <div className="success-score-card">
              <div
                className="success-circle"
                style={{ borderColor: getSuccessColor(scenarioResult.success_score) }}
              >
                <span className="score-value" style={{ color: getSuccessColor(scenarioResult.success_score) }}>
                  {scenarioResult.success_score}
                </span>
                <span className="score-label">Success Score</span>
              </div>
              <div className="score-interpretation">
                <p>{scenarioResult.success_score >= 80 ? '✅ High Success Probability' : scenarioResult.success_score >= 60 ? '⚠️ Moderate Success Probability' : '❌ Low Success Probability'}</p>
                <p className="score-note">
                  {scenarioResult.success_score >= 80 ? 'This scenario meets your retirement goals' : scenarioResult.success_score >= 60 ? 'This scenario partially meets your goals' : 'This scenario may not meet your retirement goals'}
                </p>
              </div>
            </div>
          </div>

          <div className="comparison-grid">
            <div className="comparison-section">
              <h4>📊 Key Metrics Comparison</h4>
              <div className="metrics-table">
                <div className="metric-row header">
                  <span>Metric</span>
                  <span>Baseline</span>
                  <span>Scenario</span>
                  <span>Difference</span>
                </div>

                <div className="metric-row">
                  <span>Net Worth</span>
                  <span>{formatCurrency(scenarioResult.comparison.baseline.net_worth)}</span>
                  <span>{formatCurrency(scenarioResult.comparison.scenario.net_worth)}</span>
                  <span className={scenarioResult.comparison.scenario.net_worth > scenarioResult.comparison.baseline.net_worth ? 'positive' : 'negative'}>
                    {formatCurrency(scenarioResult.comparison.scenario.net_worth - scenarioResult.comparison.baseline.net_worth)}
                  </span>
                </div>

                <div className="metric-row">
                  <span>Annual Income</span>
                  <span>{formatCurrency(scenarioResult.comparison.baseline.annual_income)}</span>
                  <span>{formatCurrency(scenarioResult.comparison.scenario.annual_income)}</span>
                  <span className={scenarioResult.comparison.scenario.annual_income > scenarioResult.comparison.baseline.annual_income ? 'positive' : 'negative'}>
                    {formatCurrency(scenarioResult.comparison.scenario.annual_income - scenarioResult.comparison.baseline.annual_income)}
                  </span>
                </div>

                <div className="metric-row">
                  <span>Required Yield</span>
                  <span>{formatPercentage(scenarioResult.comparison.baseline.required_yield, 2)}</span>
                  <span>{formatPercentage(scenarioResult.comparison.scenario.required_yield, 2)}</span>
                  <span className={scenarioResult.comparison.scenario.required_yield < scenarioResult.comparison.baseline.required_yield ? 'positive' : 'negative'}>
                    {formatPercentage(scenarioResult.comparison.scenario.required_yield - scenarioResult.comparison.baseline.required_yield, 2)}
                  </span>
                </div>

                <div className="metric-row">
                  <span>Income Sufficient</span>
                  <span>{scenarioResult.comparison.baseline.income_sufficient ? '✓ Yes' : '✗ No'}</span>
                  <span>{scenarioResult.comparison.scenario.income_sufficient ? '✓ Yes' : '✗ No'}</span>
                  <span>-</span>
                </div>

                <div className="metric-row">
                  <span>On Track for Target</span>
                  <span>{scenarioResult.comparison.baseline.on_track ? '✓ Yes' : '✗ No'}</span>
                  <span>{scenarioResult.comparison.scenario.on_track ? '✓ Yes' : '✗ No'}</span>
                  <span>-</span>
                </div>
              </div>
            </div>

            <div className="comparison-section">
              <h4>💡 Insights & Recommendations</h4>
              <div className="insights-list">
                {scenarioResult.insights && scenarioResult.insights.map((insight, index) => (
                  <div key={index} className="insight-card">
                    <span className="insight-icon">💡</span>
                    <p>{insight}</p>
                  </div>
                ))}
              </div>

              <div className="recommendations-list">
                <h5>Recommendations:</h5>
                <ul>
                  {scenarioResult.recommendations && scenarioResult.recommendations.map((rec, index) => (
                    <li key={index}>{rec}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className="scenario-details">
            <h4>📋 Scenario Details</h4>
            <div className="details-grid">
              <div className="detail-card">
                <span className="detail-label">Portfolio Value</span>
                <span className="detail-value">{formatCurrency(scenarioResult.scenario_details.portfolio_value)}</span>
              </div>
              <div className="detail-card">
                <span className="detail-label">Portfolio Yield</span>
                <span className="detail-value">{formatPercentage(scenarioResult.scenario_details.portfolio_yield, 2)}</span>
              </div>
              <div className="detail-card">
                <span className="detail-label">Growth Rate</span>
                <span className="detail-value">{formatPercentage(scenarioResult.scenario_details.portfolio_growth_rate, 2)}</span>
              </div>
              <div className="detail-card">
                <span className="detail-label">Years to Withdrawal</span>
                <span className="detail-value">{scenarioResult.scenario_details.years_to_withdrawal} years</span>
              </div>
              <div className="detail-card">
                <span className="detail-label">Years in Retirement</span>
                <span className="detail-value">{scenarioResult.scenario_details.years_in_retirement} years</span>
              </div>
              <div className="detail-card">
                <span className="detail-label">Inflation Rate</span>
                <span className="detail-value">{formatPercentage(scenarioResult.scenario_details.inflation_rate, 1)}</span>
              </div>
            </div>
          </div>

          {scenarioResult.income_details && (
            <div className="income-details">
              <h4>💵 Income & Tax Details</h4>
              <div className="details-grid">
                <div className="detail-card">
                  <span className="detail-label">Gross Income</span>
                  <span className="detail-value">{formatCurrency(scenarioResult.income_details.gross_income)}</span>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Blended Tax Rate</span>
                  <span className="detail-value">{formatPercentage(scenarioResult.income_details.blended_tax_rate * 100, 1)}</span>
                </div>
                <div className="detail-card">
                  <span className="detail-label">Tax Amount</span>
                  <span className="detail-value negative">{formatCurrency(scenarioResult.income_details.tax_on_income)}</span>
                </div>
                <div className="detail-card highlight">
                  <span className="detail-label">Net Income After Tax</span>
                  <span className="detail-value">{formatCurrency(scenarioResult.income_details.net_income_after_tax)}</span>
                </div>
                {scenarioResult.income_details.target_gross_income && (
                  <>
                    <div className="detail-card">
                      <span className="detail-label">Target Gross Income</span>
                      <span className="detail-value">{formatCurrency(scenarioResult.income_details.target_gross_income)}</span>
                    </div>
                    <div className="detail-card">
                      <span className="detail-label">Meets Target?</span>
                      <span className="detail-value">{scenarioResult.income_details.income_meets_target ? '✅ Yes' : '❌ No'}</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      )}
      <div className="crisis-scenario">
        <div className="crisis-header">
          <div>
            <h3>📉 2007–2008 Financial Crisis Simulation</h3>
            <p className="crisis-subtitle">See how your portfolio survives a real market crash — year by year</p>
          </div>
          <button
            className="crisis-button"
            onClick={() => crisisMutation.mutate()}
            disabled={crisisMutation.isPending}
          >
            {crisisMutation.isPending ? 'Simulating...' : '🔁 Run Crisis Simulation'}
          </button>
        </div>

        {crisisResult && (
          <>
            <div className="crisis-summary-cards">
              <div className="crisis-card">
                <span className="crisis-card-label">Starting Portfolio</span>
                <span className="crisis-card-value">{formatCurrency(crisisResult.summary.starting_portfolio)}</span>
                <span className="crisis-card-sub">{crisisResult.summary.cash_pct}% in cash</span>
              </div>
              <div className="crisis-card">
                <span className="crisis-card-label">Cushion Needed</span>
                <span className="crisis-card-value crisis-warn">{formatCurrency(crisisResult.summary.total_cushion_needed)}</span>
                <span className="crisis-card-sub">{formatCurrency(crisisResult.summary.cushion_with_buffer)} w/ 20% buffer</span>
              </div>
              <div className="crisis-card">
                <span className="crisis-card-label">Your Cash Reserve</span>
                <span className="crisis-card-value">{formatCurrency(crisisResult.summary.cash)}</span>
                <span className={`crisis-card-sub ${crisisResult.summary.cash_sufficient ? 'crisis-ok' : 'crisis-bad'}`}>
                  {crisisResult.summary.cash_sufficient ? '✅ Sufficient' : '❌ Not enough'}
                </span>
              </div>
              <div className="crisis-card">
                <span className="crisis-card-label">Cash Remaining After</span>
                <span className="crisis-card-value crisis-ok">{formatCurrency(crisisResult.summary.remaining_cash_after)}</span>
                <span className="crisis-card-sub">Self-sufficient at age {crisisResult.summary.self_sufficient_age}</span>
              </div>
            </div>

            <div className="crisis-comparison">
              <div className="crisis-compare-card baseline">
                <span className="crisis-compare-label">Baseline at Retirement (Age {crisisResult.summary.retirement_age})</span>
                <div className="crisis-compare-row"><span>Portfolio</span><strong>{formatCurrency(crisisResult.baseline_at_retirement.portfolio)}</strong></div>
                <div className="crisis-compare-row"><span>Gross Income</span><strong>{formatCurrency(crisisResult.baseline_at_retirement.gross_income)}</strong></div>
                <div className="crisis-compare-row"><span>Net Income</span><strong>{formatCurrency(crisisResult.baseline_at_retirement.net_income)}</strong></div>
              </div>
              {crisisResult.crash_at_retirement && (
                <div className="crisis-compare-card crash">
                  <span className="crisis-compare-label">After 2008 Crash at Retirement</span>
                  <div className="crisis-compare-row"><span>Portfolio</span><strong>{formatCurrency(crisisResult.crash_at_retirement.portfolio)}</strong></div>
                  <div className="crisis-compare-row"><span>Gross Income</span><strong>{formatCurrency(crisisResult.crash_at_retirement.gross_income)}</strong></div>
                  <div className="crisis-compare-row"><span>Net Income</span><strong>{formatCurrency(crisisResult.crash_at_retirement.net_income)}</strong></div>
                </div>
              )}
            </div>

            <div className="crisis-table-wrap">
              <table className="crisis-table">
                <thead>
                  <tr>
                    <th>Age</th>
                    <th>Phase</th>
                    <th>Portfolio</th>
                    <th>Equity Return</th>
                    <th>Net Income</th>
                    <th>Expenses</th>
                    <th>Annual Gap</th>
                    <th>Cumulative Draw</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {crisisResult.years.map((yr) => (
                    <tr key={yr.year} className={yr.retired ? (yr.self_sufficient ? 'row-ok' : 'row-gap') : 'row-working'}>
                      <td><strong>{yr.age}</strong>{yr.age === crisisResult.summary.retirement_age && <span className="retire-badge">RETIRE</span>}</td>
                      <td>{yr.phase}</td>
                      <td>{formatCurrency(yr.portfolio)}</td>
                      <td className={yr.equity_return < 0 ? 'neg' : 'pos'}>{yr.equity_return > 0 ? '+' : ''}{(yr.equity_return * 100).toFixed(1)}%</td>
                      <td>{formatCurrency(yr.net_income)}</td>
                      <td>{formatCurrency(yr.expenses)}</td>
                      <td className={yr.annual_gap > 0 ? 'neg' : ''}>{yr.annual_gap > 0 ? `-${formatCurrency(yr.annual_gap)}` : '—'}</td>
                      <td>{yr.cumulative_cushion > 0 ? formatCurrency(yr.cumulative_cushion) : '—'}</td>
                      <td>
                        {!yr.retired ? <span className="badge working">Working</span>
                          : yr.self_sufficient ? <span className="badge ok">Self-sufficient ✅</span>
                          : <span className="badge draw">Draw from cash</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default ScenarioPlanner
