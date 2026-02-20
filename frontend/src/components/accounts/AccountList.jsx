import { useState, useEffect } from 'react'
import { fetchHoldings } from '../../api/accounts'
import HoldingsList from './HoldingsList'
import { formatCurrency, formatPercentage } from '../../utils/formatters'
import './AccountList.css'

function AccountList({ accounts, onEdit, onDelete, onRefresh }) {
  const [expandedAccounts, setExpandedAccounts] = useState(new Set())
  const [accountHoldings, setAccountHoldings] = useState({})
  const [loadingHoldings, setLoadingHoldings] = useState({})

  const toggleAccount = async (accountId) => {
    const newExpanded = new Set(expandedAccounts)

    if (newExpanded.has(accountId)) {
      newExpanded.delete(accountId)
    } else {
      newExpanded.add(accountId)

      // Load holdings if not already loaded
      if (!accountHoldings[accountId]) {
        await loadHoldings(accountId)
      }
    }

    setExpandedAccounts(newExpanded)
  }

  const loadHoldings = async (accountId) => {
    setLoadingHoldings(prev => ({ ...prev, [accountId]: true }))
    try {
      const holdings = await fetchHoldings(accountId)
      setAccountHoldings(prev => ({ ...prev, [accountId]: holdings }))
    } catch (err) {
      console.error('Failed to load holdings:', err)
    } finally {
      setLoadingHoldings(prev => ({ ...prev, [accountId]: false }))
    }
  }

  const handleHoldingsChange = async (accountId) => {
    await loadHoldings(accountId)
    onRefresh()
  }

  const handleDelete = (account) => {
    if (window.confirm(`Are you sure you want to delete "${account.name}"? This will also delete all holdings in this account.`)) {
      onDelete(account.id)
    }
  }

  // Group accounts by brokerage
  const accountsByBrokerage = accounts.reduce((acc, account) => {
    const brokerage = account.brokerage_name
    if (!acc[brokerage]) {
      acc[brokerage] = []
    }
    acc[brokerage].push(account)
    return acc
  }, {})

  const calculateBrokerageTotal = (brokerageAccounts) => {
    return brokerageAccounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0)
  }

  if (accounts.length === 0) {
    return (
      <div className="no-accounts">
        <p>No accounts yet. Create your first account to get started.</p>
      </div>
    )
  }

  return (
    <div className="account-list">
      {Object.entries(accountsByBrokerage).map(([brokerage, brokerageAccounts]) => (
        <div key={brokerage} className="brokerage-group">
          <div className="brokerage-header">
            <h3>{brokerage}</h3>
            <span className="brokerage-total">
              {formatCurrency(calculateBrokerageTotal(brokerageAccounts))}
            </span>
          </div>

          <div className="accounts">
            {brokerageAccounts.map(account => (
              <div key={account.id} className="account-card">
                <div className="account-header" onClick={() => toggleAccount(account.id)}>
                  <div className="account-info">
                    <div className="account-name-row">
                      <h4>{account.name}</h4>
                      <span className="account-type-badge">{account.account_type}</span>
                    </div>
                    <div className="account-details">
                      <span className="account-balance">
                        {formatCurrency(account.current_balance)}
                      </span>
                      {account.dividend_yield && (
                        <span className="account-yield">
                          Yield: {formatPercentage(account.dividend_yield * 100)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="account-actions">
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        onEdit(account)
                      }}
                      title="Edit account"
                    >
                      ✏️
                    </button>
                    <button
                      className="btn-icon"
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDelete(account)
                      }}
                      title="Delete account"
                    >
                      🗑️
                    </button>
                    <button className="expand-icon">
                      {expandedAccounts.has(account.id) ? '▼' : '▶'}
                    </button>
                  </div>
                </div>

                {expandedAccounts.has(account.id) && (
                  <div className="account-expanded">
                    {loadingHoldings[account.id] ? (
                      <p className="loading">Loading holdings...</p>
                    ) : (
                      <HoldingsList
                        accountId={account.id}
                        holdings={accountHoldings[account.id] || []}
                        onHoldingsChange={() => handleHoldingsChange(account.id)}
                      />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default AccountList
