import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchYearProjection } from '../../api/yearProjection'
import { queryKeys } from '../../api/queryKeys'
import './YearProjection.css'

const PROJECTION_PRESETS = [
  {
    label: '⭐ Retire at 54 — Two-Sleeve (+$400K yr1, +$150K x2)',
    draft: {
      withdrawal_start_age: '54',
      starting_portfolio: '9963949',
      income_yield: '4.5',
      income_sleeve_pct: '72',
      dividend_growth: '3.5',
      growth_sleeve_return: '6.5',
      inflation: '3',
      tax_rate: '13',
    },
  },
  {
    label: '⭐ Retire at 53 — Two-Sleeve (+$400K yr1, +$150K x1)',
    draft: {
      withdrawal_start_age: '53',
      starting_portfolio: '9430720',
      income_yield: '4.5',
      income_sleeve_pct: '72',
      dividend_growth: '3.5',
      growth_sleeve_return: '6.5',
      inflation: '3',
      tax_rate: '13',
    },
  },
  {
    label: '⭐ Retire at 55 — Two-Sleeve (+$400K yr1, +$150K x2)',
    draft: {
      withdrawal_start_age: '55',
      starting_portfolio: '10362507',
      income_yield: '4.5',
      income_sleeve_pct: '72',
      dividend_growth: '3.5',
      growth_sleeve_return: '6.5',
      inflation: '3',
      tax_rate: '13',
    },
  },
]

function YearProjection() {
  const [overrides, setOverrides] = useState({})
  const [draft, setDraft] = useState({})
  const [isDirty, setIsDirty] = useState(false)
  const [activePreset, setActivePreset] = useState('')

  const { data: projection, isLoading: loading, error: queryError, refetch } = useQuery({
    queryKey: [...queryKeys.yearProjection.all, overrides],
    queryFn: () => fetchYearProjection(overrides),
    staleTime: 5 * 60 * 1000,
  })

  const handleDraftChange = (key, value) => {
    setDraft(prev => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  const handleRecalculate = () => {
    const params = {}
    const a = projection?.assumptions || {}
    const fields = {
      income_yield: 'expected_yield',
      growth_rate: 'expected_return',
      dividend_growth: 'dividend_growth_rate',
      inflation: 'inflation_rate',
      tax_rate: 'tax_rate',
      income_sleeve_pct: 'income_sleeve_pct',
      growth_sleeve_return: 'growth_sleeve_return',
      annual_reinvestment: 'annual_reinvestment',
      one_time_contribution: 'one_time_contribution',
      starting_portfolio: 'starting_portfolio',
      withdrawal_start_age: 'withdrawal_start_age',
    }
    for (const [draftKey, apiKey] of Object.entries(fields)) {
      const val = draft[draftKey]
      if (val !== undefined && val !== '') {
        const num = parseFloat(val)
        if (!isNaN(num)) {
          // percent fields — convert from display % to decimal
          const pctFields = ['income_yield', 'growth_rate', 'dividend_growth', 'inflation', 'tax_rate', 'income_sleeve_pct', 'growth_sleeve_return']
          const intFields = ['withdrawal_start_age']
          params[apiKey] = pctFields.includes(draftKey) ? num / 100 : intFields.includes(draftKey) ? Math.round(num) : num
        }
      }
    }
    setOverrides(params)
    setIsDirty(false)
  }

  const handleReset = () => {
    setDraft({})
    setOverrides({})
    setIsDirty(false)
    setActivePreset('')
  }

  const handleLoadPreset = (label) => {
    if (!label) return
    const preset = PROJECTION_PRESETS.find(p => p.label === label)
    if (!preset) return
    setDraft(preset.draft)
    setActivePreset(label)
    setIsDirty(true)
  }

  const pct = (v) => v != null ? (v * 100).toFixed(2) : ''
  const a = projection?.assumptions || {}

  const formatCompact = (amount) => {
    if (amount == null) return '—'
    if (Math.abs(amount) >= 1_000_000) return `$${(amount / 1_000_000).toFixed(1)}M`
    if (Math.abs(amount) >= 1_000) return `$${(amount / 1_000).toFixed(0)}K`
    return `$${amount.toLocaleString()}`
  }

  const error = queryError?.message || null

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
            <div className="summary-value">{formatCompact(projection.summary.starting_portfolio)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Ending Portfolio (Age 90)</div>
            <div className={`summary-value ${projection.summary.success ? 'positive' : 'negative'}`}>
              {formatCompact(projection.summary.ending_portfolio)}
            </div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Peak Portfolio</div>
            <div className="summary-value">{formatCompact(projection.summary.peak_portfolio)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Contributions</div>
            <div className="summary-value">{formatCompact(projection.summary.total_contributions)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Income (Withdrawal Phase)</div>
            <div className="summary-value">{formatCompact(projection.summary.total_income_generated)}</div>
          </div>
          <div className="summary-card">
            <div className="summary-label">Total Expenses (Withdrawal Phase)</div>
            <div className="summary-value">{formatCompact(projection.summary.total_expenses)}</div>
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

      <div className="assumptions-card interactive-assumptions">
        <div className="assumptions-header">
          <h4>🎛️ Scenario Assumptions</h4>
          <div className="assumptions-actions">
            <select
              className="preset-select"
              value={activePreset}
              onChange={e => handleLoadPreset(e.target.value)}
            >
              <option value="">Load preset…</option>
              {PROJECTION_PRESETS.map(p => (
                <option key={p.label} value={p.label}>{p.label}</option>
              ))}
            </select>
            {isDirty && <button className="btn-recalculate" onClick={handleRecalculate}>Recalculate</button>}
            {Object.keys(overrides).length > 0 && <button className="btn-reset" onClick={handleReset}>Reset to Defaults</button>}
          </div>
        </div>
        <div className="assumptions-grid">
          <div className="assumption-item editable">
            <label>Withdrawal Start Age</label>
            <input type="number" step="1" placeholder={projection.projections.find(p => p.phase === 'Withdrawal')?.age ?? ''}
              value={draft.withdrawal_start_age ?? ''} onChange={e => handleDraftChange('withdrawal_start_age', e.target.value)} />
            <span className="assumption-current">Current: {projection.projections.find(p => p.phase === 'Withdrawal')?.age}</span>
          </div>
          <div className="assumption-item editable">
            <label>Starting Portfolio ($)</label>
            <input type="number" placeholder={formatCurrency(projection.summary.starting_portfolio).replace(/[$,]/g,'')}
              value={draft.starting_portfolio ?? ''} onChange={e => handleDraftChange('starting_portfolio', e.target.value)} />
            <span className="assumption-current">Current: {formatCurrency(projection.summary.starting_portfolio)}</span>
          </div>
          <div className="assumption-item editable">
            <label>Income Yield (%)</label>
            <input type="number" step="0.1" placeholder={pct(a.expected_yield)}
              value={draft.income_yield ?? ''} onChange={e => handleDraftChange('income_yield', e.target.value)} />
            <span className="assumption-current">Current: {pct(a.expected_yield)}%</span>
          </div>
          <div className="assumption-item editable">
            <label>{a.two_sleeve_enabled ? 'Growth Sleeve Return (%)' : 'Portfolio Growth Rate (%)'}</label>
            <input type="number" step="0.1" placeholder={pct(a.two_sleeve_enabled ? a.growth_sleeve_return : a.expected_return)}
              value={draft.growth_rate ?? ''} onChange={e => handleDraftChange('growth_rate', e.target.value)} />
            <span className="assumption-current">Current: {pct(a.two_sleeve_enabled ? a.growth_sleeve_return : a.expected_return)}%</span>
          </div>
          {a.two_sleeve_enabled && (
            <>
              <div className="assumption-item editable">
                <label>Income Sleeve % (%)</label>
                <input type="number" step="1" placeholder={pct(a.income_sleeve_pct)}
                  value={draft.income_sleeve_pct ?? ''} onChange={e => handleDraftChange('income_sleeve_pct', e.target.value)} />
                <span className="assumption-current">Current: {pct(a.income_sleeve_pct)}%</span>
              </div>
              <div className="assumption-item editable">
                <label>Dividend Growth Rate (%)</label>
                <input type="number" step="0.1" placeholder={pct(a.dividend_growth_rate)}
                  value={draft.dividend_growth ?? ''} onChange={e => handleDraftChange('dividend_growth', e.target.value)} />
                <span className="assumption-current">Current: {pct(a.dividend_growth_rate)}%</span>
              </div>
            </>
          )}
          <div className="assumption-item editable">
            <label>Inflation Rate (%)</label>
            <input type="number" step="0.1" placeholder={pct(a.inflation_rate)}
              value={draft.inflation ?? ''} onChange={e => handleDraftChange('inflation', e.target.value)} />
            <span className="assumption-current">Current: {pct(a.inflation_rate)}%</span>
          </div>
          <div className="assumption-item editable">
            <label>Tax Rate (%)</label>
            <input type="number" step="0.5" placeholder={pct(a.tax_rate)}
              value={draft.tax_rate ?? ''} onChange={e => handleDraftChange('tax_rate', e.target.value)} />
            <span className="assumption-current">Current: {pct(a.tax_rate)}%</span>
          </div>
          <div className="assumption-item editable">
            <label>Annual Reinvestment ($)</label>
            <input type="number" step="1000" placeholder={a.annual_reinvestment}
              value={draft.annual_reinvestment ?? ''} onChange={e => handleDraftChange('annual_reinvestment', e.target.value)} />
            <span className="assumption-current">Current: {formatCurrency(a.annual_reinvestment)}</span>
          </div>
          <div className="assumption-item editable">
            <label>One-time Contribution ($)</label>
            <input type="number" step="1000" placeholder={a.one_time_contribution}
              value={draft.one_time_contribution ?? ''} onChange={e => handleDraftChange('one_time_contribution', e.target.value)} />
            <span className="assumption-current">Current: {formatCurrency(a.one_time_contribution)}</span>
          </div>
        </div>
        {Object.keys(overrides).length > 0 && (
          <div className="overrides-badge">⚡ Custom scenario active — not using saved config values</div>
        )}
      </div>

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
