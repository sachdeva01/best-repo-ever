import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { formatCurrency, formatPercentage } from '../../utils/formatters'
import { fetchPortfolioAllocation, implementPortfolioAllocation } from '../../api/portfolioAllocation'
import { fetchTotalAnnualExpenses } from '../../api/expenseTracking'
import { queryKeys } from '../../api/queryKeys'
import './OptimalAllocation.css'

function OptimalAllocation() {
  const queryClient = useQueryClient()

  const { data: allocation, isLoading: loading, error: allocationError } = useQuery({
    queryKey: queryKeys.portfolio.allocation(),
    queryFn: fetchPortfolioAllocation,
  })

  const { data: expensesData } = useQuery({
    queryKey: queryKeys.expenses.totalAnnual(),
    queryFn: fetchTotalAnnualExpenses,
  })
  const annualExpenses = expensesData?.total_annual_expenses || 0

  const error = allocationError?.message || null

  const implementMutation = useMutation({
    mutationFn: implementPortfolioAllocation,
    onSuccess: () => {
      toast.success('Portfolio allocation implemented successfully!')
      queryClient.invalidateQueries({ queryKey: queryKeys.portfolio.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard.all })
    },
    onError: (err) => {
      toast.error('Failed to implement allocation: ' + err.message)
    },
  })

  const implementing = implementMutation.isPending

  const handleImplement = () => {
    if (!window.confirm('This will replace your current holdings with the recommended allocation. Continue?')) {
      return
    }
    implementMutation.mutate()
  }

  if (loading) {
    return <div className="loading">Loading optimal allocation...</div>
  }

  if (error) {
    return <div className="error">{error}</div>
  }

  if (!allocation) {
    return null
  }

  return (
    <div className="optimal-allocation">
      <div className="allocation-header">
        <div>
          <h2>Optimal Portfolio Allocation</h2>
          <p className="subtitle">Based on real-time market data and current ETF yields</p>
        </div>
        <button className="implement-button" onClick={handleImplement} disabled={implementing}>
          {implementing ? 'Implementing...' : '✓ Implement This Allocation'}
        </button>
      </div>

      <div className="summary-cards">
        <div className="summary-card portfolio">
          <span className="card-icon">💼</span>
          <div className="card-content">
            <span className="card-value">{formatCurrency(allocation.total_portfolio_value)}</span>
            <span className="card-label">Total Portfolio Value</span>
          </div>
        </div>

        <div className="summary-card income">
          <span className="card-icon">💰</span>
          <div className="card-content">
            <span className="card-value">{formatCurrency(allocation.total_annual_income)}</span>
            <span className="card-label">Annual Income (Pre-Tax)</span>
            {allocation.total_after_tax_income && (
              <span className="card-sublabel">{formatCurrency(allocation.total_after_tax_income)} after tax</span>
            )}
          </div>
        </div>

        <div className="summary-card yield">
          <span className="card-icon">📈</span>
          <div className="card-content">
            <span className="card-value">{formatPercentage(allocation.portfolio_yield, 2)}</span>
            <span className="card-label">Portfolio Yield (Pre-Tax)</span>
            {allocation.after_tax_yield && (
              <span className="card-sublabel">{formatPercentage(allocation.after_tax_yield, 2)} after tax</span>
            )}
          </div>
        </div>

        <div className="summary-card surplus">
          <span className="card-icon">✓</span>
          <div className="card-content">
            <span className="card-value">{formatCurrency((allocation.total_after_tax_income || allocation.total_annual_income) - annualExpenses)}</span>
            <span className="card-label">After-Tax Surplus (vs $221K expenses)</span>
          </div>
        </div>
      </div>

      <div className="categories-grid">
        {Object.entries(allocation.allocation).map(([category, details]) => (
          <div key={category} className="category-card">
            <div className="category-header">
              <h3>{category}</h3>
              <span className="category-percentage">{formatPercentage(details.target_percentage, 0)}</span>
            </div>

            <div className="category-stats">
              <div className="stat">
                <span className="stat-label">Target Value</span>
                <span className="stat-value">{formatCurrency(details.target_value)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Category Yield</span>
                <span className="stat-value yield-value">{formatPercentage(details.category_yield, 2)}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Annual Income</span>
                <span className="stat-value income-value">{formatCurrency(details.annual_income)}</span>
              </div>
            </div>

            <div className="etfs-list">
              <h4>Holdings:</h4>
              {details.etfs.map((etf) => (
                <div key={etf.symbol} className="etf-row">
                  <div className="etf-info">
                    <span className="etf-symbol">{etf.symbol}</span>
                    <span className="etf-name">{etf.name}</span>
                  </div>
                  <div className="etf-details">
                    <div className="detail-item">
                      <span className="detail-label">Weight:</span>
                      <span className="detail-value">{formatPercentage(etf.weight_in_category * 100, 0)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Price:</span>
                      <span className="detail-value">${etf.current_price}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Shares:</span>
                      <span className="detail-value">{etf.quantity.toFixed(0)}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">Value:</span>
                      <span className="detail-value">{formatCurrency(etf.allocation_value)}</span>
                    </div>
                    <div className="detail-item highlight">
                      <span className="detail-label">Yield:</span>
                      <span className="detail-value">{formatPercentage(etf.current_yield, 2)}</span>
                    </div>
                    <div className="detail-item highlight">
                      <span className="detail-label">Income:</span>
                      <span className="detail-value">{formatCurrency(etf.annual_income)}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>


      <div className="allocation-notes">
        <h3>📌 Important Notes</h3>
        <ul>
          <li><strong>Real-Time Data:</strong> All prices and yields are fetched from current market data</li>
          <li><strong>Pre-Tax Income:</strong> {formatCurrency(allocation.total_annual_income)} annually from optimal allocation</li>
          {allocation.total_after_tax_income && (
            <li><strong>After-Tax Income:</strong> {formatCurrency(allocation.total_after_tax_income)} annually (after {allocation.tax_rates?.qualified_dividend}% qualified dividend tax and {allocation.tax_rates?.ordinary_income}% ordinary income tax)</li>
          )}
          <li><strong>After-Tax Surplus:</strong> You'll have {formatCurrency((allocation.total_after_tax_income || allocation.total_annual_income) - annualExpenses)} after-tax surplus annually for reinvestment or additional spending</li>
          <li><strong>Capital Preservation:</strong> This allocation allows you to live entirely off dividends/interest while preserving principal</li>
          <li><strong>Tax Treatment:</strong> Dividend Growth Stocks, Preferred Stock, and Growth Equities receive qualified dividend treatment (15%). High-Yield Bonds, REITs, Treasury/TIPS, and Cash receive ordinary income treatment (30%)</li>
          <li><strong>Diversification:</strong> Portfolio is diversified across 7 asset categories and 15 different ETFs</li>
          <li><strong>Tax Optimization:</strong> Consider holding ordinary income assets (JEPI, JEPQ, REITs, bonds) in tax-advantaged accounts (IRA, 401k) and qualified dividend assets in taxable accounts</li>
        </ul>
      </div>

      <div className="implementation-disclaimer">
        <p><strong>⚠️ Disclaimer:</strong> This allocation is generated automatically based on mathematical optimization and current market yields. It does not constitute personalized investment advice. Consider your individual risk tolerance, time horizon, tax situation, and consult with a licensed financial advisor before making any investment decisions. Past performance does not guarantee future results.</p>
      </div>
    </div>
  )
}

export default OptimalAllocation
