import { useState } from 'react'
import { formatCurrency } from '../../utils/formatters'
import './YearByYearProjection.css'

function YearByYearProjection({ assumptions, expensesByAge }) {
  const [expandedYear, setExpandedYear] = useState(null)

  // Generate year-by-year projections
  const generateProjections = () => {
    const projections = []

    // Starting values at age 54 (retirement)
    let incomeSleeve = 7111111
    let growthSleeve = 3006913
    let portfolio = incomeSleeve + growthSleeve

    const retirementAge = 54
    const targetAge = 90
    const inflationRate = 0.03
    const growthRate = 0.04
    const incomeYield = 0.045
    const taxRate = 0.131

    for (let age = retirementAge; age <= targetAge; age++) {
      const yearsFromRetirement = age - retirementAge

      // Determine expenses based on age
      let annualExpenses = expensesByAge.age_51_64
      if (age >= 66) {
        annualExpenses = expensesByAge.age_66_plus
      } else if (age >= 65) {
        annualExpenses = expensesByAge.age_65
      }

      // Inflate expenses
      annualExpenses = annualExpenses * Math.pow(1 + inflationRate, yearsFromRetirement)

      // Calculate income
      const grossIncome = incomeSleeve * incomeYield
      const taxes = grossIncome * taxRate
      const netIncome = grossIncome - taxes

      // Social Security (starts at age 67)
      let socialSecurity = 0
      if (age >= 67) {
        socialSecurity = 36000 * Math.pow(1.02, age - 67) // 2% COLA
      }

      const totalNetIncome = netIncome + socialSecurity
      const surplus = totalNetIncome - annualExpenses

      // Store current year data
      projections.push({
        age,
        portfolio,
        incomeSleeve,
        growthSleeve,
        grossIncome,
        taxes,
        netIncome,
        socialSecurity,
        totalNetIncome,
        annualExpenses,
        surplus,
        incomeSleevePercent: (incomeSleeve / portfolio) * 100,
        growthSleevePercent: (growthSleeve / portfolio) * 100,
      })

      // Calculate next year values
      if (age < targetAge) {
        // Income sleeve grows with inflation
        incomeSleeve = incomeSleeve * (1 + inflationRate)

        // Growth sleeve compounds + receives surplus
        growthSleeve = growthSleeve * (1 + growthRate) + Math.max(surplus, 0)

        // Update total portfolio
        portfolio = incomeSleeve + growthSleeve
      }
    }

    return projections
  }

  const projections = generateProjections()

  const toggleYear = (age) => {
    setExpandedYear(expandedYear === age ? null : age)
  }

  const getMilestoneLabel = (age) => {
    if (age === 54) return '🎯 Retirement Day'
    if (age === 65) return '🏥 Medicare Starts'
    if (age === 66) return '🏠 Mortgage Paid Off'
    if (age === 67) return '💰 Social Security Starts'
    if (age === 70) return '🎂 Age 70'
    if (age === 75) return '🎂 Age 75'
    if (age === 80) return '🎂 Age 80'
    if (age === 85) return '🎂 Age 85'
    if (age === 90) return '🎯 Target Age'
    return ''
  }

  // Show every year for first 5 years, then every 5 years
  const getDisplayYears = () => {
    return projections.filter((proj, idx) => {
      if (proj.age <= 58) return true // First 5 years
      if (proj.age >= 85) return true // Last 5 years
      if ([60, 65, 66, 67, 70, 75, 80].includes(proj.age)) return true // Milestones
      return proj.age % 5 === 0 // Every 5 years
    })
  }

  const displayYears = getDisplayYears()

  return (
    <div className="year-by-year-projection">
      <div className="projection-header">
        <h3>📈 Year-by-Year Portfolio Projection</h3>
        <p className="projection-subtitle">
          Detailed breakdown of portfolio growth, income, and expenses from age {projections[0].age} to {projections[projections.length - 1].age}
        </p>
      </div>

      <div className="projection-table-container">
        <table className="projection-table">
          <thead>
            <tr>
              <th>Age</th>
              <th>Milestone</th>
              <th>Total Portfolio</th>
              <th>Income Sleeve</th>
              <th>Growth Sleeve</th>
              <th>Gross Income</th>
              <th>After-Tax Income</th>
              <th>Expenses</th>
              <th>Surplus</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {displayYears.map((proj) => {
              const isExpanded = expandedYear === proj.age
              const milestone = getMilestoneLabel(proj.age)

              return (
                <>
                  <tr
                    key={proj.age}
                    className={`projection-row ${milestone ? 'milestone-row' : ''}`}
                    onClick={() => toggleYear(proj.age)}
                  >
                    <td className="age-cell">
                      <strong>{proj.age}</strong>
                    </td>
                    <td className="milestone-cell">{milestone}</td>
                    <td className="portfolio-cell">
                      <strong>{formatCurrency(Math.round(proj.portfolio))}</strong>
                    </td>
                    <td className="income-sleeve-cell">
                      {formatCurrency(Math.round(proj.incomeSleeve))}
                      <span className="percent">({proj.incomeSleevePercent.toFixed(0)}%)</span>
                    </td>
                    <td className="growth-sleeve-cell">
                      {formatCurrency(Math.round(proj.growthSleeve))}
                      <span className="percent">({proj.growthSleevePercent.toFixed(0)}%)</span>
                    </td>
                    <td className="income-cell">
                      {formatCurrency(Math.round(proj.grossIncome))}
                    </td>
                    <td className="after-tax-cell">
                      {formatCurrency(Math.round(proj.totalNetIncome))}
                      {proj.socialSecurity > 0 && (
                        <span className="ss-badge">+SS</span>
                      )}
                    </td>
                    <td className="expenses-cell">
                      {formatCurrency(Math.round(proj.annualExpenses))}
                    </td>
                    <td className={`surplus-cell ${proj.surplus >= 0 ? 'positive' : 'negative'}`}>
                      {formatCurrency(Math.round(proj.surplus))}
                    </td>
                    <td className="expand-cell">
                      <button className="expand-btn">
                        {isExpanded ? '▼' : '▶'}
                      </button>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="details-row">
                      <td colSpan="10">
                        <div className="year-details">
                          <div className="details-section">
                            <h4>📊 Portfolio Calculation (Age {proj.age})</h4>
                            <div className="calc-grid">
                              <div className="calc-item">
                                <span className="calc-label">Income Sleeve (Beginning):</span>
                                <span className="calc-value">{formatCurrency(Math.round(proj.incomeSleeve))}</span>
                              </div>
                              <div className="calc-item">
                                <span className="calc-label">Growth Sleeve (Beginning):</span>
                                <span className="calc-value">{formatCurrency(Math.round(proj.growthSleeve))}</span>
                              </div>
                              <div className="calc-item total">
                                <span className="calc-label">Total Portfolio:</span>
                                <span className="calc-value">{formatCurrency(Math.round(proj.portfolio))}</span>
                              </div>
                            </div>

                            <h5>Growth Assumptions:</h5>
                            <ul className="assumptions-list">
                              <li><strong>Income Sleeve Growth:</strong> 3% (inflation) - Maintains purchasing power</li>
                              <li><strong>Growth Sleeve Growth:</strong> 4% annual return + surplus reinvestment</li>
                              <li><strong>Income Sleeve Yield:</strong> 4.5% (tax-efficient blend)</li>
                            </ul>
                          </div>

                          <div className="details-section">
                            <h4>💰 Income Calculation (Pre-Tax)</h4>
                            <div className="calc-grid">
                              <div className="calc-item">
                                <span className="calc-label">Income Sleeve Size:</span>
                                <span className="calc-value">{formatCurrency(Math.round(proj.incomeSleeve))}</span>
                              </div>
                              <div className="calc-item">
                                <span className="calc-label">× Yield Rate:</span>
                                <span className="calc-value">4.5%</span>
                              </div>
                              <div className="calc-item total">
                                <span className="calc-label">Gross Annual Income:</span>
                                <span className="calc-value">{formatCurrency(Math.round(proj.grossIncome))}</span>
                              </div>
                            </div>

                            <h5>Income Sources:</h5>
                            <ul className="income-sources">
                              <li>
                                <strong>Tax-Free Municipal Bonds (40%):</strong> {formatCurrency(Math.round(proj.incomeSleeve * 0.40 * 0.037))}
                                <span className="detail"> ({formatCurrency(Math.round(proj.incomeSleeve * 0.40))} @ 3.7% yield)</span>
                              </li>
                              <li>
                                <strong>High-Dividend Stocks (30%):</strong> {formatCurrency(Math.round(proj.incomeSleeve * 0.30 * 0.054))}
                                <span className="detail"> ({formatCurrency(Math.round(proj.incomeSleeve * 0.30))} @ 5.4% yield)</span>
                              </li>
                              <li>
                                <strong>Growth Allocation (30%):</strong> {formatCurrency(Math.round(proj.incomeSleeve * 0.30 * 0.045))}
                                <span className="detail"> ({formatCurrency(Math.round(proj.incomeSleeve * 0.30))} @ 4.5% blended)</span>
                              </li>
                            </ul>
                          </div>

                          <div className="details-section">
                            <h4>📉 Tax & Net Income</h4>
                            <div className="calc-grid">
                              <div className="calc-item">
                                <span className="calc-label">Gross Income:</span>
                                <span className="calc-value">{formatCurrency(Math.round(proj.grossIncome))}</span>
                              </div>
                              <div className="calc-item">
                                <span className="calc-label">- Federal/State Taxes (13.1%):</span>
                                <span className="calc-value negative">-{formatCurrency(Math.round(proj.taxes))}</span>
                              </div>
                              <div className="calc-item">
                                <span className="calc-label">Net Investment Income:</span>
                                <span className="calc-value">{formatCurrency(Math.round(proj.netIncome))}</span>
                              </div>
                              {proj.socialSecurity > 0 && (
                                <>
                                  <div className="calc-item">
                                    <span className="calc-label">+ Social Security:</span>
                                    <span className="calc-value positive">+{formatCurrency(Math.round(proj.socialSecurity))}</span>
                                  </div>
                                  <div className="calc-item total">
                                    <span className="calc-label">Total Net Income:</span>
                                    <span className="calc-value">{formatCurrency(Math.round(proj.totalNetIncome))}</span>
                                  </div>
                                </>
                              )}
                            </div>

                            <h5>Why Only 13.1% Tax?</h5>
                            <ul className="tax-breakdown">
                              <li>40% in tax-free municipal bonds = $0 federal tax</li>
                              <li>Qualified dividends taxed at 15% (not 20-30%)</li>
                              <li>Blended effective rate: 13.1% vs. 30%+ on salary</li>
                            </ul>
                          </div>

                          <div className="details-section">
                            <h4>💸 Expenses & Surplus</h4>
                            <div className="calc-grid">
                              <div className="calc-item">
                                <span className="calc-label">Annual Expenses:</span>
                                <span className="calc-value negative">{formatCurrency(Math.round(proj.annualExpenses))}</span>
                              </div>
                              <div className="calc-item">
                                <span className="calc-label">Total Net Income:</span>
                                <span className="calc-value">{formatCurrency(Math.round(proj.totalNetIncome))}</span>
                              </div>
                              <div className={`calc-item total ${proj.surplus >= 0 ? 'positive-bg' : 'negative-bg'}`}>
                                <span className="calc-label">Annual Surplus:</span>
                                <span className="calc-value">{formatCurrency(Math.round(proj.surplus))}</span>
                              </div>
                            </div>

                            <div className="surplus-note">
                              {proj.surplus >= 0 ? (
                                <p className="positive">
                                  ✓ Surplus of {formatCurrency(Math.round(proj.surplus))} reinvested into Growth Sleeve for compounding.
                                </p>
                              ) : (
                                <p className="negative">
                                  ⚠ Shortfall covered by Growth Sleeve withdrawal.
                                </p>
                              )}
                            </div>
                          </div>

                          {proj.age === 65 && (
                            <div className="milestone-note medicare">
                              <strong>🏥 Medicare Milestone:</strong> Health insurance switches from $26K/year private insurance to $5K/year Medicare supplemental. Saves $21,000/year!
                            </div>
                          )}

                          {proj.age === 66 && (
                            <div className="milestone-note mortgage">
                              <strong>🏠 Mortgage Milestone:</strong> Mortgage fully paid off. Expenses drop by $30,000/year (principal payment eliminated).
                            </div>
                          )}

                          {proj.age === 67 && (
                            <div className="milestone-note social-security">
                              <strong>💰 Social Security Milestone:</strong> Social Security benefits begin at ${formatCurrency(Math.round(proj.socialSecurity))}/year with 2% annual COLA adjustments.
                            </div>
                          )}
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

      <div className="projection-summary">
        <h4>📋 Summary</h4>
        <div className="summary-stats">
          <div className="summary-stat">
            <span className="stat-label">Starting Portfolio (Age 54):</span>
            <span className="stat-value">{formatCurrency(projections[0].portfolio)}</span>
          </div>
          <div className="summary-stat">
            <span className="stat-label">Ending Portfolio (Age 90):</span>
            <span className="stat-value">{formatCurrency(projections[projections.length - 1].portfolio)}</span>
          </div>
          <div className="summary-stat highlight">
            <span className="stat-label">Total Growth:</span>
            <span className="stat-value">
              {formatCurrency(projections[projections.length - 1].portfolio - projections[0].portfolio)}
              ({((projections[projections.length - 1].portfolio / projections[0].portfolio - 1) * 100).toFixed(0)}% increase)
            </span>
          </div>
        </div>
        <p className="summary-note">
          💡 <strong>Tip:</strong> Click on any year to see detailed calculations for portfolio value and income sources.
        </p>
      </div>
    </div>
  )
}

export default YearByYearProjection
