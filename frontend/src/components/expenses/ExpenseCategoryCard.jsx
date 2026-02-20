import { useState } from 'react'
import { formatCurrency, formatCurrencyDetailed } from '../../utils/formatters'
import './ExpenseCategoryCard.css'

function ExpenseCategoryCard({ category, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false)
  const [amount, setAmount] = useState(category.annual_amount || 0)
  const [submitting, setSubmitting] = useState(false)

  const handleEdit = () => {
    setAmount(category.annual_amount || 0)
    setIsEditing(true)
  }

  const handleCancel = () => {
    setAmount(category.annual_amount || 0)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (amount < 0) {
      alert('Amount cannot be negative')
      return
    }

    setSubmitting(true)
    try {
      await onUpdate(category.id, { annual_amount: parseFloat(amount) })
      setIsEditing(false)
    } catch (err) {
      alert('Failed to update category: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const monthlyAmount = (category.annual_amount || 0) / 12

  return (
    <div className="expense-category-card">
      <div className="category-header">
        <div className="category-icon">
          {getCategoryIcon(category.name)}
        </div>
        <div className="category-info">
          <h4>{category.name}</h4>
          {category.description && (
            <p className="category-description">{category.description}</p>
          )}
        </div>
      </div>

      <div className="category-amounts">
        {isEditing ? (
          <div className="edit-mode">
            <div className="amount-input-group">
              <label>Annual Amount</label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                step="0.01"
                min="0"
                autoFocus
                disabled={submitting}
              />
            </div>
            <div className="edit-actions">
              <button
                className="btn btn-sm btn-primary"
                onClick={handleSave}
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save'}
              </button>
              <button
                className="btn btn-sm btn-secondary"
                onClick={handleCancel}
                disabled={submitting}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="view-mode">
            <div className="amount-display">
              <div className="amount-row">
                <span className="amount-label">Annual</span>
                <span className="amount-value annual">{formatCurrency(category.annual_amount || 0)}</span>
              </div>
              <div className="amount-row">
                <span className="amount-label">Monthly</span>
                <span className="amount-value monthly">{formatCurrency(monthlyAmount)}</span>
              </div>
            </div>
            <button
              className="btn btn-sm btn-secondary"
              onClick={handleEdit}
            >
              Edit
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function getCategoryIcon(categoryName) {
  const icons = {
    'Health Insurance': '🏥',
    'Mortgage': '🏠',
    'Utilities and Cash Expenses': '💡',
    'Credit Cards': '💳',
    'Other Miscellaneous': '📦'
  }
  return icons[categoryName] || '📊'
}

export default ExpenseCategoryCard
