import { useState } from 'react'
import { createHolding, updateHolding, deleteHolding } from '../../api/accounts'
import { ASSET_TYPES } from '../../utils/constants'
import { formatCurrencyDetailed, formatPercentage } from '../../utils/formatters'
import './HoldingsList.css'

function HoldingsList({ accountId, holdings, onHoldingsChange }) {
  const [showForm, setShowForm] = useState(false)
  const [editingHolding, setEditingHolding] = useState(null)
  const [formData, setFormData] = useState({
    symbol: '',
    name: '',
    asset_type: '',
    quantity: '',
    price_per_share: '',
    dividend_yield: ''
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const resetForm = () => {
    setFormData({
      symbol: '',
      name: '',
      asset_type: '',
      quantity: '',
      price_per_share: '',
      dividend_yield: ''
    })
    setErrors({})
    setEditingHolding(null)
  }

  const handleEdit = (holding) => {
    setEditingHolding(holding)
    setFormData({
      symbol: holding.symbol || '',
      name: holding.name || '',
      asset_type: holding.asset_type || '',
      quantity: holding.quantity || '',
      price_per_share: holding.price_per_share || '',
      dividend_yield: holding.dividend_yield ? (holding.dividend_yield * 100).toFixed(2) : ''
    })
    setShowForm(true)
  }

  const handleDelete = async (holdingId) => {
    if (!window.confirm('Are you sure you want to delete this holding?')) {
      return
    }

    try {
      await deleteHolding(holdingId)
      onHoldingsChange()
    } catch (err) {
      alert('Failed to delete holding: ' + err.message)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const newErrors = {}
    if (!formData.symbol.trim()) newErrors.symbol = 'Symbol is required'
    if (!formData.name.trim()) newErrors.name = 'Name is required'
    if (!formData.asset_type) newErrors.asset_type = 'Asset type is required'
    if (!formData.quantity || formData.quantity <= 0) newErrors.quantity = 'Valid quantity is required'
    if (!formData.price_per_share || formData.price_per_share <= 0) newErrors.price_per_share = 'Valid price is required'

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    setSubmitting(true)
    try {
      const submitData = {
        account_id: accountId,
        symbol: formData.symbol.trim().toUpperCase(),
        name: formData.name.trim(),
        asset_type: formData.asset_type,
        quantity: parseFloat(formData.quantity),
        price_per_share: parseFloat(formData.price_per_share),
        dividend_yield: formData.dividend_yield ? parseFloat(formData.dividend_yield) / 100 : null
      }

      if (editingHolding) {
        await updateHolding(editingHolding.id, submitData)
      } else {
        await createHolding(submitData)
      }

      onHoldingsChange()
      resetForm()
      setShowForm(false)
    } catch (err) {
      alert('Failed to save holding: ' + err.message)
    } finally {
      setSubmitting(false)
    }
  }

  const calculateTotal = (quantity, price) => {
    return quantity * price
  }

  const totalValue = holdings.reduce((sum, h) => sum + calculateTotal(h.quantity, h.price_per_share), 0)

  return (
    <div className="holdings-list">
      <div className="holdings-header">
        <h4>Holdings</h4>
        <button
          className="btn btn-sm btn-primary"
          onClick={() => {
            resetForm()
            setShowForm(!showForm)
          }}
        >
          {showForm ? 'Cancel' : '+ Add Holding'}
        </button>
      </div>

      {showForm && (
        <form className="holding-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label>Symbol *</label>
              <input
                type="text"
                value={formData.symbol}
                onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                placeholder="AAPL"
                className={errors.symbol ? 'error' : ''}
              />
              {errors.symbol && <span className="error-message">{errors.symbol}</span>}
            </div>

            <div className="form-group">
              <label>Name *</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Apple Inc."
                className={errors.name ? 'error' : ''}
              />
              {errors.name && <span className="error-message">{errors.name}</span>}
            </div>

            <div className="form-group">
              <label>Asset Type *</label>
              <select
                value={formData.asset_type}
                onChange={(e) => setFormData({ ...formData, asset_type: e.target.value })}
                className={errors.asset_type ? 'error' : ''}
              >
                <option value="">Select type</option>
                {ASSET_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.asset_type && <span className="error-message">{errors.asset_type}</span>}
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Quantity *</label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                placeholder="100"
                step="0.001"
                min="0"
                className={errors.quantity ? 'error' : ''}
              />
              {errors.quantity && <span className="error-message">{errors.quantity}</span>}
            </div>

            <div className="form-group">
              <label>Price per Share *</label>
              <input
                type="number"
                value={formData.price_per_share}
                onChange={(e) => setFormData({ ...formData, price_per_share: e.target.value })}
                placeholder="150.00"
                step="0.01"
                min="0"
                className={errors.price_per_share ? 'error' : ''}
              />
              {errors.price_per_share && <span className="error-message">{errors.price_per_share}</span>}
            </div>

            <div className="form-group">
              <label>Dividend Yield (%)</label>
              <input
                type="number"
                value={formData.dividend_yield}
                onChange={(e) => setFormData({ ...formData, dividend_yield: e.target.value })}
                placeholder="2.50"
                step="0.01"
                min="0"
                max="100"
              />
            </div>
          </div>

          <div className="form-actions">
            <button type="submit" className="btn btn-sm btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : editingHolding ? 'Update' : 'Add'}
            </button>
            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={() => {
                resetForm()
                setShowForm(false)
              }}
              disabled={submitting}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {holdings.length === 0 ? (
        <p className="no-holdings">No holdings yet. Add your first holding above.</p>
      ) : (
        <>
          <div className="holdings-table-container">
            <table className="holdings-table">
              <thead>
                <tr>
                  <th>Symbol</th>
                  <th>Name</th>
                  <th>Type</th>
                  <th className="text-right">Quantity</th>
                  <th className="text-right">Price</th>
                  <th className="text-right">Yield</th>
                  <th className="text-right">Total Value</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {holdings.map(holding => (
                  <tr key={holding.id}>
                    <td className="symbol">{holding.symbol}</td>
                    <td>{holding.name}</td>
                    <td>
                      <span className="asset-type-badge">{holding.asset_type}</span>
                    </td>
                    <td className="text-right">{holding.quantity}</td>
                    <td className="text-right">{formatCurrencyDetailed(holding.price_per_share)}</td>
                    <td className="text-right">
                      {holding.dividend_yield ? formatPercentage(holding.dividend_yield * 100) : '-'}
                    </td>
                    <td className="text-right total-value">
                      {formatCurrencyDetailed(calculateTotal(holding.quantity, holding.price_per_share))}
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button
                          className="btn-icon"
                          onClick={() => handleEdit(holding)}
                          title="Edit"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => handleDelete(holding.id)}
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan="6" className="text-right"><strong>Total Value:</strong></td>
                  <td className="text-right total-value"><strong>{formatCurrencyDetailed(totalValue)}</strong></td>
                  <td></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </div>
  )
}

export default HoldingsList
