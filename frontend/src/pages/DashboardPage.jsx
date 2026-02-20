import { useDashboard } from '../hooks/useDashboard'
import MarketDataBar from '../components/dashboard/MarketDataBar'
import QuickStats from '../components/dashboard/QuickStats'
import AssetAllocation from '../components/dashboard/AssetAllocation'
import IncomeComparison from '../components/dashboard/IncomeComparison'
import Assumptions from '../components/dashboard/Assumptions'
import RefreshButton from '../components/dashboard/RefreshButton'
import './DashboardPage.css'

function DashboardPage() {
  const { quickStats, allocation, marketData, expectedReturns, incomeComparison, retirementConfig, loading, error, loadData } = useDashboard()

  return (
    <div className="dashboard-page">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p className="page-subtitle">Portfolio overview and key retirement metrics</p>
        </div>
        <RefreshButton onRefresh={loadData} />
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">Loading dashboard...</div>
      ) : (
        <div className="dashboard-content">
          <MarketDataBar marketData={marketData} />

          <QuickStats stats={quickStats} expectedReturns={expectedReturns} />

          {incomeComparison && expectedReturns && (
            <IncomeComparison comparison={incomeComparison} expectedReturns={expectedReturns} />
          )}

          <div className="dashboard-grid">
            <div className="grid-item">
              <AssetAllocation allocation={allocation} />
            </div>

            <div className="grid-item">
              <div className="summary-card">
                <h3>💡 Getting Started</h3>
                <div className="getting-started">
                  <div className="step">
                    <span className="step-number">1</span>
                    <div>
                      <strong>Add Accounts</strong>
                      <p>Go to the Accounts page to add your brokerage accounts and holdings</p>
                    </div>
                  </div>
                  <div className="step">
                    <span className="step-number">2</span>
                    <div>
                      <strong>Set Expenses</strong>
                      <p>Update your annual expense categories on the Expenses page</p>
                    </div>
                  </div>
                  <div className="step">
                    <span className="step-number">3</span>
                    <div>
                      <strong>Review Retirement Plan</strong>
                      <p>Check your retirement projections and income analysis</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {quickStats && quickStats.total_net_worth > 0 && (
            <div className="summary-insights">
              <div className="insight-card">
                <h4>📊 Portfolio Status</h4>
                <p>
                  You have <strong>${(quickStats.total_net_worth / 1000000).toFixed(2)}M</strong> in assets
                  generating <strong>${(quickStats.annual_dividend_income / 1000).toFixed(1)}K</strong> annually.
                  You're <strong>{quickStats.progress_to_target_percentage.toFixed(1)}%</strong> of the way
                  to your retirement target.
                </p>
              </div>
              <div className="insight-card">
                <h4>⏰ Timeline</h4>
                <p>
                  You have <strong>{quickStats.years_to_withdrawal} years</strong> until withdrawal starts.
                  Focus on building dividend income and growing your portfolio to reach your target.
                </p>
              </div>
            </div>
          )}

          <Assumptions
            config={retirementConfig}
            stats={quickStats}
            expectedReturns={expectedReturns}
          />
        </div>
      )}
    </div>
  )
}

export default DashboardPage
