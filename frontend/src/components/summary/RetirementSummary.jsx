import { useQuery } from '@tanstack/react-query'
import { fetchTotalAnnualExpenses } from '../../api/expenseTracking'
import { fetchAccounts } from '../../api/accounts'
import { queryKeys } from '../../api/queryKeys'
import { formatCurrency } from '../../utils/formatters'
import YearByYearProjection from './YearByYearProjection'
import './RetirementSummary.css'

function RetirementSummary() {
  const { data: accounts = [], isLoading: accountsLoading, error: accountsError } = useQuery({
    queryKey: queryKeys.accounts.all,
    queryFn: fetchAccounts,
  })

  const { data: totalAnnual, isLoading: expensesLoading, error: expensesError } = useQuery({
    queryKey: queryKeys.expenses.totalAnnual(),
    queryFn: fetchTotalAnnualExpenses,
  })

  // Show loading state
  if (accountsLoading || expensesLoading) {
    return (
      <div className="retirement-summary">
        <div className="loading-state">
          <h2>Loading retirement summary...</h2>
          <p>Fetching portfolio and expense data</p>
        </div>
      </div>
    )
  }

  // Show error state
  if (accountsError || expensesError) {
    return (
      <div className="retirement-summary">
        <div className="error-state">
          <h2>Error loading data</h2>
          <p>{accountsError?.message || expensesError?.message}</p>
        </div>
      </div>
    )
  }

  // Calculate portfolio totals
  const totalInvestments = accounts.reduce((sum, acc) => sum + (acc.investments || 0), 0)
  const totalCash = accounts.reduce((sum, acc) => sum + (acc.cash || 0), 0)
  const totalNetWorth = totalInvestments + totalCash

  // Calculate weighted average dividend yield
  const totalDividendIncome = accounts.reduce((sum, acc) => {
    const investments = acc.investments || 0
    const yield_rate = acc.dividend_yield || 0
    return sum + (investments * yield_rate)
  }, 0)
  const portfolioYield = totalInvestments > 0 ? (totalDividendIncome / totalInvestments) * 100 : 0

  // Assumptions from the retirement plan
  const assumptions = {
    currentAge: 51,
    retirementAge: 55,  // Updated to age 55
    socialSecurityAge: 67,
    targetAge: 90,
    inflationRate: 3.0,
    growthRate: 4.0,
    cashYield: 3.66,  // Current cash yield (high-yield savings)
    targetYield: 3.97,  // Target yield at retirement (two-sleeve strategy)
    contributionsNeeded: 375000,
    contributionPeriod: 3,
    annualContribution: 125000,
  }

  // Age-based expenses (use actual values from database)
  const currentExpenses = totalAnnual?.total_annual_expenses || 241027
  const expensesByAge = {
    age_51_64: currentExpenses,
    age_65: currentExpenses - 26000 + 5000, // Switch to Medicare (save $21K)
    age_66_plus: currentExpenses - 26000 + 5000 - 30000, // Medicare + mortgage paid off (save $51K)
  }

  // Project portfolio at retirement (age 55) - Use documented values
  const yearsToRetirement = assumptions.retirementAge - assumptions.currentAge
  const projectedPortfolio = 10118024 // Projected value at retirement
  const incomeSleeve = projectedPortfolio * 0.80 // 80% income sleeve
  const growthSleeve = projectedPortfolio * 0.20 // 20% growth sleeve

  // Calculate retirement income
  const annualIncomeFromSleeve = incomeSleeve * (assumptions.targetYield / 100)
  const taxRate = 0.246 // 24.6% effective tax rate
  const netIncome = annualIncomeFromSleeve * (1 - taxRate)
  const expensesAtRetirement = expensesByAge.age_51_64 * Math.pow(1 + assumptions.inflationRate / 100, yearsToRetirement)
  const annualSurplus = netIncome - expensesAtRetirement

  // Portfolio projections at age 90 - Use documented values from FINAL_RECOMMENDATION.md
  const yearsInRetirement = assumptions.targetAge - assumptions.retirementAge
  const portfolioProjection = 47023747
  const incomeSleeveProjection = 34683580
  const growthSleeveProjection = 12340167

  return (
    <div className="retirement-summary">
      <div className="summary-header">
        <h2>📊 Retirement Plan Summary</h2>
        <p className="subtitle">Complete overview of assumptions, portfolio, and projections</p>
      </div>

      {/* Current Portfolio Status */}
      <section className="summary-section portfolio-status">
        <h3>💼 Current Portfolio Status (Age {assumptions.currentAge})</h3>
        <div className="metrics-grid">
          <div className="metric-card primary">
            <div className="metric-label">Total Net Worth</div>
            <div className="metric-value">{formatCurrency(totalNetWorth)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Investments</div>
            <div className="metric-value">{formatCurrency(totalInvestments)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Cash & Equivalents</div>
            <div className="metric-value">{formatCurrency(totalCash)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Portfolio Yield</div>
            <div className="metric-value">{portfolioYield.toFixed(2)}%</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Annual Dividend Income</div>
            <div className="metric-value">{formatCurrency(totalDividendIncome)}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Current Annual Expenses</div>
            <div className="metric-value">{formatCurrency(expensesByAge.age_51_64)}</div>
          </div>
        </div>

        <div className="info-box" style={{ marginTop: '20px', padding: '15px', backgroundColor: '#f0f7ff', borderLeft: '4px solid #2196F3', borderRadius: '4px' }}>
          <strong>💡 About Portfolio Yield</strong>
          <p style={{ margin: '8px 0 0 0', fontSize: '14px', lineHeight: '1.5' }}>
            <strong>Current: {portfolioYield.toFixed(2)}%</strong> - Your actual yield from existing growth investments (QQQ, VUG, etc.).
            This is intentionally low during accumulation phase (age {assumptions.currentAge}-{assumptions.retirementAge - 1}) to maximize growth.
            <br />
            <strong>Target at Retirement: {assumptions.targetYield}%</strong> - After rebalancing to income-focused ETFs (JEPI, SCHD, VYM) at age {assumptions.retirementAge},
            your yield will increase to {assumptions.targetYield}% to cover living expenses.
          </p>
        </div>
      </section>

      {/* Key Assumptions */}
      <section className="summary-section assumptions">
        <h3>📋 Plan Assumptions</h3>
        <div className="assumptions-grid">
          <div className="assumption-group">
            <h4>Timeline</h4>
            <div className="assumption-item">
              <span className="label">Current Age:</span>
              <span className="value">{assumptions.currentAge}</span>
            </div>
            <div className="assumption-item">
              <span className="label">Retirement Age:</span>
              <span className="value highlight">{assumptions.retirementAge}</span>
            </div>
            <div className="assumption-item">
              <span className="label">Social Security Age:</span>
              <span className="value">{assumptions.socialSecurityAge}</span>
            </div>
            <div className="assumption-item">
              <span className="label">Target Age:</span>
              <span className="value">{assumptions.targetAge}</span>
            </div>
            <div className="assumption-item">
              <span className="label">Years to Retirement:</span>
              <span className="value">{yearsToRetirement} years</span>
            </div>
          </div>

          <div className="assumption-group">
            <h4>Contributions</h4>
            <div className="assumption-item">
              <span className="label">Total Needed:</span>
              <span className="value">{formatCurrency(assumptions.contributionsNeeded)}</span>
            </div>
            <div className="assumption-item">
              <span className="label">Contribution Period:</span>
              <span className="value">{assumptions.contributionPeriod} years</span>
            </div>
            <div className="assumption-item">
              <span className="label">Annual Contribution:</span>
              <span className="value highlight">{formatCurrency(assumptions.annualContribution)}</span>
            </div>
            <div className="assumption-item">
              <span className="label">Monthly Contribution:</span>
              <span className="value">{formatCurrency(assumptions.annualContribution / 12)}</span>
            </div>
          </div>

          <div className="assumption-group">
            <h4>Growth & Returns</h4>
            <div className="assumption-item">
              <span className="label">Pre-Retirement Growth:</span>
              <span className="value">{assumptions.growthRate}%</span>
            </div>
            <div className="assumption-item">
              <span className="label">Target Income Yield:</span>
              <span className="value highlight">{assumptions.targetYield}%</span>
            </div>
            <div className="assumption-item">
              <span className="label">Cash Yield:</span>
              <span className="value">{assumptions.cashYield}%</span>
            </div>
            <div className="assumption-item">
              <span className="label">Inflation Rate:</span>
              <span className="value">{assumptions.inflationRate}%</span>
            </div>
            <div className="assumption-item">
              <span className="label">Effective Tax Rate:</span>
              <span className="value">{(taxRate * 100).toFixed(1)}%</span>
            </div>
          </div>

          <div className="assumption-group">
            <h4>Expenses by Age</h4>
            <div className="assumption-item">
              <span className="label">Ages {assumptions.currentAge}-64:</span>
              <span className="value">{formatCurrency(Math.round(expensesByAge.age_51_64))}/year</span>
            </div>
            <div className="assumption-item">
              <span className="label">Age 65 (Medicare):</span>
              <span className="value success">{formatCurrency(Math.round(expensesByAge.age_65))}/year</span>
            </div>
            <div className="assumption-item">
              <span className="label">Age 66+ (No Mortgage):</span>
              <span className="value success">{formatCurrency(Math.round(expensesByAge.age_66_plus))}/year</span>
            </div>
            <div className="assumption-item">
              <span className="label">Savings at 65:</span>
              <span className="value">{formatCurrency(Math.round(expensesByAge.age_51_64 - expensesByAge.age_65))}/year</span>
            </div>
            <div className="assumption-item">
              <span className="label">Savings at 66:</span>
              <span className="value">{formatCurrency(Math.round(expensesByAge.age_51_64 - expensesByAge.age_66_plus))}/year</span>
            </div>
          </div>
        </div>
      </section>

      {/* Retirement Projection */}
      <section className="summary-section retirement-projection">
        <h3>🎯 At Retirement (Age {assumptions.retirementAge})</h3>
        <div className="projection-cards">
          <div className="projection-card large">
            <div className="card-header">
              <span className="icon">💰</span>
              <span className="title">Projected Portfolio</span>
            </div>
            <div className="card-value primary">{formatCurrency(projectedPortfolio)}</div>
            <div className="card-subtext">
              Growth from {formatCurrency(totalNetWorth)} + {formatCurrency(assumptions.contributionsNeeded)} contributions
            </div>
          </div>

          <div className="projection-card">
            <div className="card-header">
              <span className="icon">📊</span>
              <span className="title">Income Sleeve</span>
            </div>
            <div className="card-value">{formatCurrency(incomeSleeve)}</div>
            <div className="card-subtext">{((incomeSleeve / projectedPortfolio) * 100).toFixed(0)}% of portfolio</div>
            <div className="card-detail">
              Generates {formatCurrency(annualIncomeFromSleeve)}/year @ {assumptions.targetYield}%
            </div>
          </div>

          <div className="projection-card">
            <div className="card-header">
              <span className="icon">🚀</span>
              <span className="title">Growth Sleeve</span>
            </div>
            <div className="card-value">{formatCurrency(growthSleeve)}</div>
            <div className="card-subtext">{((growthSleeve / projectedPortfolio) * 100).toFixed(0)}% of portfolio</div>
            <div className="card-detail">
              Compounds @ {assumptions.growthRate}% with surplus reinvestment
            </div>
          </div>
        </div>

        <div className="income-breakdown">
          <h4>Annual Income & Expenses (Year 1 of Retirement)</h4>
          <div className="breakdown-grid">
            <div className="breakdown-item">
              <span className="label">Gross Income from Sleeve:</span>
              <span className="value">{formatCurrency(annualIncomeFromSleeve)}</span>
            </div>
            <div className="breakdown-item">
              <span className="label">Taxes (13.1%):</span>
              <span className="value negative">-{formatCurrency(annualIncomeFromSleeve * taxRate)}</span>
            </div>
            <div className="breakdown-item total">
              <span className="label">Net Income:</span>
              <span className="value">{formatCurrency(netIncome)}</span>
            </div>
            <div className="breakdown-item">
              <span className="label">Annual Expenses:</span>
              <span className="value negative">-{formatCurrency(expensesAtRetirement)}</span>
            </div>
            <div className="breakdown-item highlight">
              <span className="label">Annual Surplus:</span>
              <span className="value success">{formatCurrency(annualSurplus)}</span>
            </div>
          </div>
          <div className="breakdown-note">
            ✓ Surplus reinvested into Growth Sleeve for compounding
          </div>
        </div>
      </section>

      {/* Long-term Projection */}
      <section className="summary-section long-term">
        <h3>🔮 Long-term Projection (Age {assumptions.targetAge})</h3>
        <div className="projection-cards">
          <div className="projection-card large success">
            <div className="card-header">
              <span className="icon">🏆</span>
              <span className="title">Total Portfolio at Age {assumptions.targetAge}</span>
            </div>
            <div className="card-value">{formatCurrency(portfolioProjection)}</div>
            <div className="card-subtext">
              After {yearsInRetirement} years of retirement
            </div>
          </div>

          <div className="projection-card">
            <div className="card-header">
              <span className="icon">📊</span>
              <span className="title">Income Sleeve</span>
            </div>
            <div className="card-value">{formatCurrency(incomeSleeveProjection)}</div>
            <div className="card-subtext">
              Generating {formatCurrency(incomeSleeveProjection * (assumptions.targetYield / 100))}/year
            </div>
          </div>

          <div className="projection-card">
            <div className="card-header">
              <span className="icon">🚀</span>
              <span className="title">Growth Sleeve</span>
            </div>
            <div className="card-value">{formatCurrency(growthSleeveProjection)}</div>
            <div className="card-subtext">
              {((growthSleeveProjection / portfolioProjection) * 100).toFixed(0)}% of total portfolio
            </div>
          </div>
        </div>

        <div className="milestone-comparison">
          <h4>Target vs. Projection</h4>
          <div className="comparison-bar">
            <div className="comparison-item">
              <div className="label">Original Target</div>
              <div className="bar">
                <div className="fill target" style={{ width: '10%' }}></div>
              </div>
              <div className="value">{formatCurrency(4250000)}</div>
            </div>
            <div className="comparison-item">
              <div className="label">Projected Portfolio</div>
              <div className="bar">
                <div className="fill projected" style={{ width: '100%' }}></div>
              </div>
              <div className="value success">{formatCurrency(portfolioProjection)}</div>
            </div>
          </div>
          <div className="comparison-result">
            <span className="icon">🎉</span>
            <span className="text">
              Exceeds target by <strong>{formatCurrency(portfolioProjection - 4250000)}</strong> ({((portfolioProjection / 4250000 - 1) * 100).toFixed(0)}x target!)
            </span>
          </div>
        </div>
      </section>

      {/* Year-by-Year Projection */}
      <YearByYearProjection />

      {/* Key Insights */}
      <section className="summary-section insights">
        <h3>💡 Key Insights</h3>
        <div className="insights-grid">
          <div className="insight-card success">
            <div className="insight-icon">✅</div>
            <div className="insight-content">
              <div className="insight-title">Early Retirement Achievable</div>
              <div className="insight-text">
                Retire at age {assumptions.retirementAge} (3 years early) with only {formatCurrency(assumptions.contributionsNeeded)} in contributions over {assumptions.contributionPeriod} years.
              </div>
            </div>
          </div>

          <div className="insight-card success">
            <div className="insight-icon">💰</div>
            <div className="insight-content">
              <div className="insight-title">Income Covers Expenses</div>
              <div className="insight-text">
                4.5% yield strategy generates {formatCurrency(annualIncomeFromSleeve)}/year, comfortably covering {formatCurrency(expensesAtRetirement)} expenses with {formatCurrency(annualSurplus)} surplus.
              </div>
            </div>
          </div>

          <div className="insight-card success">
            <div className="insight-icon">📉</div>
            <div className="insight-content">
              <div className="insight-title">Expenses Decrease with Age</div>
              <div className="insight-text">
                Medicare (age 65) saves $21K/year. Mortgage payoff (age 66) saves $30K/year. Total reduction: $51K/year (22%).
              </div>
            </div>
          </div>

          <div className="insight-card success">
            <div className="insight-icon">🎯</div>
            <div className="insight-content">
              <div className="insight-title">Exceeds Targets</div>
              <div className="insight-text">
                Final portfolio of {formatCurrency(portfolioProjection)} is {((portfolioProjection / 4250000).toFixed(1))}x your $4.25M target, ensuring legacy and security.
              </div>
            </div>
          </div>

          <div className="insight-card info">
            <div className="insight-icon">🏥</div>
            <div className="insight-content">
              <div className="insight-title">Tax-Efficient Strategy</div>
              <div className="insight-text">
                40% allocation to tax-free municipal bonds reduces effective tax rate to 13.1% (vs. 20-30% on salary income).
              </div>
            </div>
          </div>

          <div className="insight-card info">
            <div className="insight-icon">🔄</div>
            <div className="insight-content">
              <div className="insight-title">Two-Sleeve Balance</div>
              <div className="insight-text">
                70/30 Income/Growth split provides stable income while allowing significant wealth accumulation through compounding.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Action Items */}
      <section className="summary-section actions">
        <h3>📝 Action Items</h3>
        <div className="action-timeline">
          <div className="action-phase">
            <div className="phase-header">
              <span className="phase-badge">NOW</span>
              <span className="phase-title">Immediate Actions (Ages {assumptions.currentAge}-53)</span>
            </div>
            <ul className="action-list">
              <li>✓ Fix $2.24M earning 0% dividends → Move to JEPI, SCHD, VTEB, MUB (+$78K income/year)</li>
              <li>⏳ Set up automatic contributions: {formatCurrency(assumptions.annualContribution)}/year ({formatCurrency(assumptions.annualContribution / 12)}/month)</li>
              <li>⏳ Research health insurance options for ages 54-64 (ACA marketplace)</li>
              <li>⏳ Review and optimize current portfolio yield (target {assumptions.targetYield}%)</li>
            </ul>
          </div>

          <div className="action-phase">
            <div className="phase-header">
              <span className="phase-badge">AGE {assumptions.retirementAge}</span>
              <span className="phase-title">Retirement Day</span>
            </div>
            <ul className="action-list">
              <li>⏳ Give notice at work (1 month before)</li>
              <li>⏳ Restructure portfolio into two-sleeve strategy</li>
              <li>⏳ Set up automatic monthly income: {formatCurrency(annualIncomeFromSleeve / 12)}/month</li>
              <li>⏳ Enroll in health insurance (ACA or COBRA)</li>
            </ul>
          </div>

          <div className="action-phase">
            <div className="phase-header">
              <span className="phase-badge">AGE 65</span>
              <span className="phase-title">Medicare Enrollment</span>
            </div>
            <ul className="action-list">
              <li>⏳ Enroll in Medicare Parts A, B, and D (3 months before 65th birthday)</li>
              <li>⏳ Choose Medigap Plan G or Medicare Advantage</li>
              <li>⏳ Cancel private health insurance</li>
              <li>⏳ Update expense tracking (-$21K/year)</li>
            </ul>
          </div>

          <div className="action-phase">
            <div className="phase-header">
              <span className="phase-badge">AGE 66</span>
              <span className="phase-title">Mortgage Payoff</span>
            </div>
            <ul className="action-list">
              <li>⏳ Verify mortgage paid in full</li>
              <li>⏳ Obtain satisfaction letter</li>
              <li>⏳ Set up direct property tax payments</li>
              <li>⏳ Update expense tracking (-$30K/year)</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  )
}

export default RetirementSummary
