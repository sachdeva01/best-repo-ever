import { useState, useEffect } from 'react'
import { fetchRebalancingAnalysis, fetchPortfolioRecommendations } from '../api/rebalancing'
import { fetchScenarioPresets } from '../api/scenario'
import RebalancingAnalysis from '../components/portfolio/RebalancingAnalysis'
import PortfolioRecommendations from '../components/portfolio/PortfolioRecommendations'
import ScenarioPlanner from '../components/portfolio/ScenarioPlanner'
import OptimalAllocation from '../components/portfolio/OptimalAllocation'
import MonteCarloSimulation from '../components/portfolio/MonteCarloSimulation'
import YearProjection from '../components/portfolio/YearProjection'
import './PortfolioManagementPage.css'

function PortfolioManagementPage() {
  const [activeTab, setActiveTab] = useState('optimal')
  const [rebalancing, setRebalancing] = useState(null)
  const [recommendations, setRecommendations] = useState(null)
  const [scenarioPresets, setScenarioPresets] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)

      const [rebalancingData, recommendationsData, presetsData] = await Promise.all([
        fetchRebalancingAnalysis(),
        fetchPortfolioRecommendations(),
        fetchScenarioPresets()
      ])

      setRebalancing(rebalancingData)
      setRecommendations(recommendationsData)
      setScenarioPresets(presetsData)
    } catch (err) {
      setError(err.message || 'Failed to load portfolio management data')
      console.error('Error loading portfolio management:', err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="portfolio-management-page">
      <div className="page-header">
        <div>
          <h2>Portfolio Management</h2>
          <p className="page-subtitle">Optimize your portfolio allocation and test scenarios</p>
        </div>
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'optimal' ? 'active' : ''}`}
          onClick={() => setActiveTab('optimal')}
        >
          <span className="tab-icon">💎</span>
          Optimal Allocation
        </button>
        <button
          className={`tab ${activeTab === 'rebalancing' ? 'active' : ''}`}
          onClick={() => setActiveTab('rebalancing')}
        >
          <span className="tab-icon">⚖️</span>
          Rebalancing Analysis
        </button>
        <button
          className={`tab ${activeTab === 'recommendations' ? 'active' : ''}`}
          onClick={() => setActiveTab('recommendations')}
        >
          <span className="tab-icon">💡</span>
          Recommendations
        </button>
        <button
          className={`tab ${activeTab === 'scenario' ? 'active' : ''}`}
          onClick={() => setActiveTab('scenario')}
        >
          <span className="tab-icon">🎯</span>
          Scenario Planner
        </button>
        <button
          className={`tab ${activeTab === 'montecarlo' ? 'active' : ''}`}
          onClick={() => setActiveTab('montecarlo')}
        >
          <span className="tab-icon">🎲</span>
          Monte Carlo
        </button>
        <button
          className={`tab ${activeTab === 'projection' ? 'active' : ''}`}
          onClick={() => setActiveTab('projection')}
        >
          <span className="tab-icon">📊</span>
          Year Projection
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">Loading portfolio management tools...</div>
      ) : (
        <div className="tab-content">
          {activeTab === 'optimal' && (
            <OptimalAllocation />
          )}
          {activeTab === 'rebalancing' && rebalancing && (
            <RebalancingAnalysis data={rebalancing} onRefresh={loadData} />
          )}
          {activeTab === 'recommendations' && recommendations && (
            <PortfolioRecommendations data={recommendations} onRefresh={loadData} />
          )}
          {activeTab === 'scenario' && scenarioPresets && (
            <ScenarioPlanner presets={scenarioPresets} />
          )}
          {activeTab === 'montecarlo' && (
            <MonteCarloSimulation />
          )}
          {activeTab === 'projection' && (
            <YearProjection />
          )}
        </div>
      )}
    </div>
  )
}

export default PortfolioManagementPage
