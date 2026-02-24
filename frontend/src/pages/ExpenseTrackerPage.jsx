import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { fetchTotalAnnualExpenses } from '../api/expenseTracking'
import { queryKeys } from '../api/queryKeys'
import { formatCurrency } from '../utils/formatters'
import ExpenseEntry from '../components/expenses/ExpenseEntry'
import ExpenseList from '../components/expenses/ExpenseList'
import ExpenseAnalytics from '../components/expenses/ExpenseAnalytics'
import RecurringExpenses from '../components/expenses/RecurringExpenses'
import OneTimeExpenses from '../components/expenses/OneTimeExpenses'
import './ExpenseTrackerPage.css'

function ExpenseTrackerPage() {
  const [activeTab, setActiveTab] = useState('entry')

  const { data: totalAnnual, isLoading: loading } = useQuery({
    queryKey: queryKeys.expenses.totalAnnual(),
    queryFn: fetchTotalAnnualExpenses,
  })

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
          <ExpenseEntry />
        )}
        {activeTab === 'list' && (
          <ExpenseList />
        )}
        {activeTab === 'recurring' && (
          <RecurringExpenses />
        )}
        {activeTab === 'onetime' && (
          <OneTimeExpenses />
        )}
        {activeTab === 'analytics' && (
          <ExpenseAnalytics />
        )}
      </div>
    </div>
  )
}

export default ExpenseTrackerPage
