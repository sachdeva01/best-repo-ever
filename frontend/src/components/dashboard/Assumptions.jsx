import { formatCurrency, formatPercentage } from '../../utils/formatters'
import './Assumptions.css'

function Assumptions({ config, stats, expectedReturns }) {
  if (!config) return null

  const assumptions = [
    {
      category: "Retirement Timeline",
      items: [
        { label: "Current Age", value: config.current_age },
        { label: "Withdrawal Start Age", value: config.withdrawal_start_age },
        { label: "Social Security Start Age", value: config.social_security_start_age },
        { label: "Planning Horizon (Target Age)", value: config.target_age },
        { label: "Years to Withdrawal", value: stats?.years_to_withdrawal || 4 }
      ]
    },
    {
      category: "Portfolio Targets",
      items: [
        { label: "Target Portfolio Value at Age 90", value: formatCurrency(config.target_portfolio_value) },
        { label: "Current Progress to Target", value: formatPercentage(stats?.progress_to_target_percentage || 0, 1) }
      ]
    },
    {
      category: "Growth & Returns",
      items: [
        { label: "Expected Annual Growth Rate", value: formatPercentage((expectedReturns?.expected_growth_rate || 0.06) * 100, 0), note: "Conservative market growth assumption" },
        { label: "Expected Portfolio Yield", value: formatPercentage((expectedReturns?.expected_portfolio_yield || 0.037) * 100, 2), note: "Based on optimal allocation with real-time ETF yields" },
        { label: "Annual Reinvestment from Surplus", value: "$20,000", note: "Reinvested annually for compound growth" },
        { label: "One-time Contribution (by age 55)", value: "$250,000", note: "Additional capital injection" }
      ]
    },
    {
      category: "Tax Assumptions",
      items: [
        { label: "Blended Tax Rate", value: formatPercentage((config.qualified_dividend_tax_rate || 0.2464) * 100, 2), note: "Weighted by account types" },
        { label: "401(k)/Traditional IRA (54.3%)", value: "20%", note: "Federal tax on withdrawal" },
        { label: "Taxable Accounts (45.7%)", value: "30.17%", note: "23.8% federal + 6.37% NJ state" }
      ]
    },
    {
      category: "Expenses & Income",
      items: [
        { label: "Current Annual Expenses", value: formatCurrency(stats?.total_annual_expenses || 221000) },
        { label: "Inflation Rate", value: formatPercentage(config.inflation_rate * 100, 1), note: "Applied to expense projections" },
        { label: "Estimated Social Security (Monthly)", value: formatCurrency(config.estimated_social_security_monthly || 3000), note: "Starts at age 67" }
      ]
    },
    {
      category: "Capital Preservation Strategy",
      items: [
        { label: "Investment Approach", value: "Live off dividends/interest", note: "Preserve principal while generating income" },
        { label: "Target Allocation", value: "7 asset categories, 15+ ETFs", note: "30% Div Growth, 20% High-Yield, 10% REITs, 15% Treasury/TIPS, 5% Preferred, 8% Cash, 12% Growth" },
        { label: "Rebalancing Frequency", value: "Quarterly or >5% drift", note: "Maintain target allocation" }
      ]
    }
  ]

  return (
    <div className="assumptions-section">
      <div className="assumptions-header">
        <h3>📋 Planning Assumptions</h3>
        <p className="assumptions-subtitle">All projections and calculations are based on the following assumptions</p>
      </div>

      <div className="assumptions-grid">
        {assumptions.map((section, idx) => (
          <div key={idx} className="assumption-category">
            <h4>{section.category}</h4>
            <div className="assumption-items">
              {section.items.map((item, itemIdx) => (
                <div key={itemIdx} className="assumption-item">
                  <span className="assumption-label">{item.label}</span>
                  <span className="assumption-value">{item.value}</span>
                  {item.note && <span className="assumption-note">{item.note}</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="assumptions-disclaimer">
        <p>
          <strong>⚠️ Important Disclaimer:</strong> These assumptions are estimates based on current information and market conditions.
          Actual results may vary due to market volatility, economic changes, tax law modifications, and personal circumstances.
          Past performance does not guarantee future results. Review and adjust these assumptions regularly, and consult with
          a licensed financial advisor before making investment decisions.
        </p>
      </div>
    </div>
  )
}

export default Assumptions
