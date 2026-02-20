import { useState } from 'react'
import { formatCurrency, formatPercentage } from '../../utils/formatters'
import { analyzeScenario } from '../../api/scenario'
import './ScenarioPlanner.css'

function ScenarioPlanner({ presets }) {
  const [selectedPreset, setSelectedPreset] = useState('')
  const [scenarioInput, setScenarioInput] = useState({})
  const [scenarioResult, setScenarioResult] = useState(null)
  const [loading, setLoading] = useState(false)

  const handlePresetSelect = (presetName) => {
    setSelectedPreset(presetName)
    const preset = presets.find(p => p.name === presetName)
    if (preset) {
      setScenarioInput(preset.parameters)
    }
  }

  const handleInputChange = (field, value) => {
    setScenarioInput(prev => ({
      ...prev,
      [field]: value === '' ? null : parseFloat(value)
    }))
  }

  const handleAnalyze = async () => {
    setLoading(true)
    try {
      const result = await analyzeScenario(scenarioInput)
      setScenarioResult(result)
    } catch (error) {
      console.error('Failed to analyze scenario:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    setSelectedPreset('')
    setScenarioInput({})
    setScenarioResult(null)
  }

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
        </div>
      )}
    </div>
  )
}

export default ScenarioPlanner
