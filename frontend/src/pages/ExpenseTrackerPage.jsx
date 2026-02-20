import { useState, useEffect } from 'react'
import { fetchTotalAnnualExpenses } from '../api/expenseTracking'
import { formatCurrency } from '../utils/formatters'
import ExpenseEntry from '../components/expenses/ExpenseEntry'
import ExpenseList from '../components/expenses/ExpenseList'
import ExpenseAnalytics from '../components/expenses/ExpenseAnalytics'
import RecurringExpenses from '../components/expenses/RecurringExpenses'
import OneTimeExpenses from '../components/expenses/OneTimeExpenses'
import './ExpenseTrackerPage.css'

function ExpenseTrackerPage() {
  const [activeTab, setActiveTab] = useState('entry')
  const [refreshTrigger, setRefreshTrigger] = useState(0)
  const [totalAnnual, setTotalAnnual] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadTotalAnnual()
  }, [refreshTrigger])

  const loadTotalAnnual = async () => {
    try {
      setLoading(true)
      const data = await fetchTotalAnnualExpenses()
      setTotalAnnual(data)
    } catch (err) {
      console.error('Failed to load total annual expenses:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleExpenseAdded = () => {
    // Trigger refresh of other components
    setRefreshTrigger(prev => prev + 1)
  }

  return (
    <div className="expense-tracker-page">
      <div className="page-header">
        <div>
          <h2>Expense Tracker</h2>
          <p className="page-subtitle">Track household expenses, one-time purchases, and recurring costs</p>
        </div>
        {!loading && totalAnnual && (
          <div className="total-annual-badge">
            <div className="badge-label">Total Annual Expenses</div>
            <div className="badge-amount">{formatCurrency(totalAnnual.total_annual_expenses)}</div>
            <div className="badge-note">Used for retirement calculations</div>
          </div>
        )}
      </div>

      <div className="tabs">
        <button
          className={`tab ${activeTab === 'entry' ? 'active' : ''}`}
          onClick={() => setActiveTab('entry')}
        >
          <span className="tab-icon">➕</span>
          Add Expense
        </button>
        <button
          className={`tab ${activeTab === 'list' ? 'active' : ''}`}
          onClick={() => setActiveTab('list')}
        >
          <span className="tab-icon">📋</span>
          All Expenses
        </button>
        <button
          className={`tab ${activeTab === 'recurring' ? 'active' : ''}`}
          onClick={() => setActiveTab('recurring')}
        >
          <span className="tab-icon">🔄</span>
          Recurring
        </button>
        <button
          className={`tab ${activeTab === 'onetime' ? 'active' : ''}`}
          onClick={() => setActiveTab('onetime')}
        >
          <span className="tab-icon">🚗</span>
          One-Time/Big Purchases
        </button>
        <button
          className={`tab ${activeTab === 'analytics' ? 'active' : ''}`}
          onClick={() => setActiveTab('analytics')}
        >
          <span className="tab-icon">📊</span>
          Analytics
        </button>
      </div>

      <div className="tab-content">
        {activeTab === 'entry' && (
          <ExpenseEntry onExpenseAdded={handleExpenseAdded} />
        )}
        {activeTab === 'list' && (
          <ExpenseList refreshTrigger={refreshTrigger} />
        )}
        {activeTab === 'recurring' && (
          <RecurringExpenses refreshTrigger={refreshTrigger} />
        )}
        {activeTab === 'onetime' && (
          <OneTimeExpenses refreshTrigger={refreshTrigger} />
        )}
        {activeTab === 'analytics' && (
          <ExpenseAnalytics refreshTrigger={refreshTrigger} />
        )}
      </div>
    </div>
  )
}

export default ExpenseTrackerPage
