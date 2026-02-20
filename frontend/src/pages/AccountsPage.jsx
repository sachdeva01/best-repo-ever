import { useState } from 'react'
import { useAccounts } from '../hooks/useAccounts'
import AccountList from '../components/accounts/AccountList'
import AccountForm from '../components/accounts/AccountForm'
import { formatCurrency } from '../utils/formatters'
import './AccountsPage.css'

function AccountsPage() {
  const { accounts, loading, error, addAccount, editAccount, removeAccount, loadAccounts } = useAccounts()
  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState(null)

  const handleCreateAccount = async (accountData) => {
    try {
      await addAccount(accountData)
      setShowForm(false)
    } catch (err) {
      alert('Failed to create account: ' + err.message)
    }
  }

  const handleUpdateAccount = async (accountData) => {
    try {
      await editAccount(editingAccount.id, accountData)
      setEditingAccount(null)
      setShowForm(false)
    } catch (err) {
      alert('Failed to update account: ' + err.message)
    }
  }

  const handleEdit = (account) => {
    setEditingAccount(account)
    setShowForm(true)
  }

  const handleDelete = async (accountId) => {
    try {
      await removeAccount(accountId)
    } catch (err) {
      alert('Failed to delete account: ' + err.message)
    }
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingAccount(null)
  }

  const totalNetWorth = accounts.reduce((sum, acc) => sum + (acc.current_balance || 0), 0)

  return (
    <div className="accounts-page">
      <div className="page-header">
        <div>
          <h2>Brokerage Accounts</h2>
          <p className="page-subtitle">Manage your accounts and holdings across all brokerages</p>
        </div>
        <div className="header-stats">
          <div className="stat-card">
            <span className="stat-label">Total Net Worth</span>
            <span className="stat-value">{formatCurrency(totalNetWorth)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Total Accounts</span>
            <span className="stat-value">{accounts.length}</span>
          </div>
        </div>
      </div>

      <div className="page-actions">
        <button
          className="btn btn-primary"
          onClick={() => {
            setEditingAccount(null)
            setShowForm(!showForm)
          }}
        >
          {showForm ? 'Cancel' : '+ Add Account'}
        </button>
      </div>

      {showForm && (
        <div className="form-section">
          <h3>{editingAccount ? 'Edit Account' : 'Create New Account'}</h3>
          <AccountForm
            account={editingAccount}
            onSubmit={editingAccount ? handleUpdateAccount : handleCreateAccount}
            onCancel={handleCancel}
          />
        </div>
      )}

      {error && <div className="error">{error}</div>}

      {loading ? (
        <div className="loading">Loading accounts...</div>
      ) : (
        <AccountList
          accounts={accounts}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onRefresh={loadAccounts}
        />
      )}
    </div>
  )
}

export default AccountsPage
