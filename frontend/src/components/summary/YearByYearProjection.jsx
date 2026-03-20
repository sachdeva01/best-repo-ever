import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchYearProjection } from '../../api/yearProjection'
import { queryKeys } from '../../api/queryKeys'
import './YearByYearProjection.css'

const PROJECTION_PRESETS = [
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

function YearByYearProjection() {
  const [overrides, setOverrides] = useState({})
  const [draft, setDraft] = useState({})
  const [isDirty, setIsDirty] = useState(false)
  const [activePreset, setActivePreset] = useState('')
  const [expandedYear, setExpandedYear] = useState(null)

  const { data: projection, isLoading, error } = useQuery({
    queryKey: [...queryKeys.yearProjection.all, 'summary', overrides],
    queryFn: () => fetchYearProjection(overrides),
    staleTime: 5 * 60 * 1000,
  })

  const handleDraftChange = (key, value) => {
    setDraft(prev => ({ ...prev, [key]: value }))
    setIsDirty(true)
  }

  const handleRecalculate = () => {
    const params = {}
    const pctFields = ['income_yield', 'growth_rate', 'dividend_growth', 'inflation', 'tax_rate', 'income_sleeve_pct', 'growth_sleeve_return']
    const intFields = ['withdrawal_start_age']
    const fieldMap = {
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
    for (const [draftKey, apiKey] of Object.entries(fieldMap)) {
      const val = draft[draftKey]
      if (val !== undefined && val !== '') {
        const num = parseFloat(val)
        if (!isNaN(num)) {
          params[apiKey] = pctFields.includes(draftKey) ? num / 100
            : intFields.includes(draftKey) ? Math.round(num)
            : num
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

  const formatCurrency = (v) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(v)
  const formatCompact = (v) => {
    if (v == null) return '—'
    if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
    return `$${v.toLocaleString()}`
  }
  const pct = (v) => v != null ? (v * 100).toFixed(2) : ''
  const a = projection?.assumptions || {}

  // Show milestones + every 5th year
  const displayRows = projection?.projections?.filter(p =>
    p.milestone ||
    p.year === 0 ||
    (p.age % 5 === 0)
  ) || []

  if (isLoading) return <div className="ybyr-loading">Loading projection...</div>
  if (error) return <div className="ybyr-error">Error: {error.message}</div>
  if (!projection) return null

  const s = projection.summary

  return (
    <div className="year-by-year-projection">
      <div className="projection-header">
        <h3>📈 Year-by-Year Portfolio Projection</h3>
        <p className="projection-subtitle">
          Ages {projection.projections[0]?.age} – {projection.projections[projection.projections.length - 1]?.age}
        </p>
      </div>

      {/* Summary Cards */}
      <div className="ybyr-summary-cards">
        <div className="ybyr-card">
          <div className="ybyr-card-label">Starting Portfolio</div>
          <div className="ybyr-card-value">{formatCompact(s.starting_portfolio)}</div>
        </div>
        <div className="ybyr-card">
          <div className="ybyr-card-label">Ending Portfolio (Age 90)</div>
          <div className={`ybyr-card-value ${s.success ? 'positive' : 'negative'}`}>{formatCompact(s.ending_portfolio)}</div>
        </div>
        <div className="ybyr-card">
          <div className="ybyr-card-label">Peak Portfolio</div>
          <div className="ybyr-card-value">{formatCompact(s.peak_portfolio)}</div>
        </div>
        <div className="ybyr-card">
          <div className="ybyr-card-label">Total Contributions</div>
          <div className="ybyr-card-value">{formatCompact(s.total_contributions)}</div>
        </div>
        <div className="ybyr-card">
          <div className="ybyr-card-label">Total Income (Withdrawal)</div>
          <div className="ybyr-card-value">{formatCompact(s.total_income_generated)}</div>
        </div>
        <div className="ybyr-card">
          <div className="ybyr-card-label">Total Expenses (Withdrawal)</div>
          <div className="ybyr-card-value">{formatCompact(s.total_expenses)}</div>
        </div>
        <div className={`ybyr-card ${s.success ? 'ybyr-card-success' : 'ybyr-card-warning'}`}>
          <div className="ybyr-card-label">Plan Status</div>
          <div className="ybyr-card-value">{s.success ? '✓ Success' : '✗ Deficit'}</div>
        </div>
      </div>

      {/* Interactive Assumptions */}
      <div className="ybyr-assumptions">
        <div className="ybyr-assumptions-header">
          <h4>🎛️ Scenario Assumptions</h4>
          <div className="ybyr-assumptions-actions">
            <select className="ybyr-preset-select" value={activePreset} onChange={e => handleLoadPreset(e.target.value)}>
              <option value="">Load preset…</option>
              {PROJECTION_PRESETS.map(p => <option key={p.label} value={p.label}>{p.label}</option>)}
            </select>
            {isDirty && <button className="ybyr-btn-recalculate" onClick={handleRecalculate}>Recalculate</button>}
            {Object.keys(overrides).length > 0 && <button className="ybyr-btn-reset" onClick={handleReset}>Reset to Defaults</button>}
          </div>
        </div>

        <div className="ybyr-fields-grid">
          <div className="ybyr-field">
            <label>Withdrawal Start Age</label>
            <input type="number" step="1"
              placeholder={projection.projections.find(p => p.phase === 'Withdrawal')?.age ?? ''}
              value={draft.withdrawal_start_age ?? ''}
              onChange={e => handleDraftChange('withdrawal_start_age', e.target.value)} />
            <span className="ybyr-field-hint">Current: {projection.projections.find(p => p.phase === 'Withdrawal')?.age}</span>
          </div>

          <div className="ybyr-field">
            <label>Starting Portfolio ($)</label>
            <input type="number" step="10000"
              placeholder={s.starting_portfolio}
              value={draft.starting_portfolio ?? ''}
              onChange={e => handleDraftChange('starting_portfolio', e.target.value)} />
            <span className="ybyr-field-hint">Current: {formatCompact(s.starting_portfolio)}</span>
          </div>

          <div className="ybyr-field">
            <label>Income Yield (%)</label>
            <input type="number" step="0.1"
              placeholder={pct(a.expected_yield)}
              value={draft.income_yield ?? ''}
              onChange={e => handleDraftChange('income_yield', e.target.value)} />
            <span className="ybyr-field-hint">Current: {pct(a.expected_yield)}%</span>
          </div>

          <div className="ybyr-field">
            <label>{a.two_sleeve_enabled ? 'Growth Sleeve Return (%)' : 'Portfolio Growth Rate (%)'}</label>
            <input type="number" step="0.1"
              placeholder={pct(a.two_sleeve_enabled ? a.growth_sleeve_return : a.expected_return)}
              value={draft.growth_rate ?? ''}
              onChange={e => handleDraftChange('growth_rate', e.target.value)} />
            <span className="ybyr-field-hint">Current: {pct(a.two_sleeve_enabled ? a.growth_sleeve_return : a.expected_return)}%</span>
          </div>

          {a.two_sleeve_enabled && (
            <>
              <div className="ybyr-field">
                <label>Income Sleeve (%)</label>
                <input type="number" step="1"
                  placeholder={pct(a.income_sleeve_pct)}
                  value={draft.income_sleeve_pct ?? ''}
                  onChange={e => handleDraftChange('income_sleeve_pct', e.target.value)} />
                <span className="ybyr-field-hint">Current: {pct(a.income_sleeve_pct)}%</span>
              </div>

              <div className="ybyr-field">
                <label>Dividend Growth Rate (%)</label>
                <input type="number" step="0.1"
                  placeholder={pct(a.dividend_growth_rate)}
                  value={draft.dividend_growth ?? ''}
                  onChange={e => handleDraftChange('dividend_growth', e.target.value)} />
                <span className="ybyr-field-hint">Current: {pct(a.dividend_growth_rate)}%</span>
              </div>
            </>
          )}

          <div className="ybyr-field">
            <label>Inflation Rate (%)</label>
            <input type="number" step="0.1"
              placeholder={pct(a.inflation_rate)}
              value={draft.inflation ?? ''}
              onChange={e => handleDraftChange('inflation', e.target.value)} />
            <span className="ybyr-field-hint">Current: {pct(a.inflation_rate)}%</span>
          </div>

          <div className="ybyr-field">
            <label>Tax Rate (%)</label>
            <input type="number" step="0.5"
              placeholder={pct(a.tax_rate)}
              value={draft.tax_rate ?? ''}
              onChange={e => handleDraftChange('tax_rate', e.target.value)} />
            <span className="ybyr-field-hint">Current: {pct(a.tax_rate)}%</span>
          </div>

          <div className="ybyr-field">
            <label>Annual Reinvestment ($)</label>
            <input type="number" step="1000"
              placeholder={a.annual_reinvestment}
              value={draft.annual_reinvestment ?? ''}
              onChange={e => handleDraftChange('annual_reinvestment', e.target.value)} />
            <span className="ybyr-field-hint">Current: {formatCompact(a.annual_reinvestment)}</span>
          </div>
        </div>

        {Object.keys(overrides).length > 0 && (
          <div className="ybyr-active-badge">⚡ Custom scenario active — not using saved config values</div>
        )}
      </div>

      {/* Projection Table */}
      <div className="projection-table-container">
        <table className="projection-table">
          <thead>
            <tr>
              <th>Age</th>
              <th>Phase</th>
              <th>Portfolio</th>
              <th>Income (AT)</th>
              <th>Expenses</th>
              <th>Surplus / Deficit</th>
              <th>Milestone</th>
            </tr>
          </thead>
          <tbody>
            {displayRows.map(p => {
              const isExpanded = expandedYear === p.age
              return (
                <>
                  <tr
                    key={p.age}
                    className={`projection-row ${p.milestone ? 'milestone-row' : ''} ${p.surplus_deficit < 0 ? 'deficit-row' : ''}`}
                    onClick={() => setExpandedYear(isExpanded ? null : p.age)}
                  >
                    <td><strong>{p.age}</strong></td>
                    <td><span className={`phase-badge ${p.phase.toLowerCase()}`}>{p.phase}</span></td>
                    <td className="portfolio-cell"><strong>{formatCurrency(p.portfolio_value)}</strong></td>
                    <td>{formatCurrency(p.portfolio_income_aftertax)}</td>
                    <td>{formatCurrency(p.expenses)}</td>
                    <td className={p.surplus_deficit >= 0 ? 'positive' : 'negative'}>
                      {formatCurrency(p.surplus_deficit)}
                    </td>
                    <td>{p.milestone || '—'}</td>
                  </tr>
                  {isExpanded && (
                    <tr key={`${p.age}-detail`} className="details-row">
                      <td colSpan="7">
                        <div className="year-details">
                          <div className="detail-col">
                            <div className="detail-title">Portfolio</div>
                            <div className="detail-row"><span>Value (start of year)</span><span>{formatCurrency(p.portfolio_value)}</span></div>
                            {p.contribution > 0 && <div className="detail-row"><span>Contribution</span><span className="positive">+{formatCurrency(p.contribution)}</span></div>}
                            {p.reinvestment > 0 && <div className="detail-row"><span>Reinvestment</span><span className="positive">+{formatCurrency(p.reinvestment)}</span></div>}
                          </div>
                          <div className="detail-col">
                            <div className="detail-title">Income</div>
                            <div className="detail-row"><span>Pre-tax</span><span>{formatCurrency(p.portfolio_income_pretax)}</span></div>
                            <div className="detail-row"><span>After-tax</span><span>{formatCurrency(p.portfolio_income_aftertax)}</span></div>
                            {p.social_security_income > 0 && <div className="detail-row"><span>Social Security</span><span className="positive">+{formatCurrency(p.social_security_income)}</span></div>}
                            <div className="detail-row"><span>Total (AT)</span><strong>{formatCurrency(p.total_income_aftertax)}</strong></div>
                          </div>
                          <div className="detail-col">
                            <div className="detail-title">Expenses</div>
                            <div className="detail-row"><span>Gross</span><span>{formatCurrency(p.expenses)}</span></div>
                            <div className="detail-row"><span>Net (after SS)</span><span>{formatCurrency(p.net_expenses)}</span></div>
                            <div className="detail-row"><span>Surplus / Deficit</span>
                              <span className={p.surplus_deficit >= 0 ? 'positive' : 'negative'}>
                                {formatCurrency(p.surplus_deficit)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              )
            })}
          </tbody>
        </table>
      </div>

      <p className="ybyr-table-note">💡 Click any row to see detailed breakdown. Showing milestones + every 5th year.</p>
    </div>
  )
}

export default YearByYearProjection
