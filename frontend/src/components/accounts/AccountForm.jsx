import { useState, useEffect } from 'react'
import { BROKERAGES, ACCOUNT_TYPES } from '../../utils/constants'
import './AccountForm.css'

function AccountForm({ account, onSubmit, onCancel }) {
  const [formData, setFormData] = useState({
    name: '',
    brokerage_name: '',
    account_type: '',
    current_balance: '',
    dividend_yield: ''
  })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (account) {
      setFormData({
        name: account.name || '',
        brokerage_name: account.brokerage_name || '',
        account_type: account.account_type || '',
        current_balance: account.current_balance || '',
        dividend_yield: account.dividend_yield ? (account.dividend_yield * 100).toFixed(2) : ''
      })
    }
  }, [account])

  const validate = () => {
    const newErrors = {}

    if (!formData.name.trim()) {
      newErrors.name = 'Account name is required'
    }

    if (!formData.brokerage_name) {
      newErrors.brokerage_name = 'Brokerage is required'
    }

    if (!formData.account_type) {
      newErrors.account_type = 'Account type is required'
    }

    if (!formData.current_balance || formData.current_balance <= 0) {
      newErrors.current_balance = 'Valid balance is required'
    }

    if (formData.dividend_yield && (formData.dividend_yield < 0 || formData.dividend_yield > 100)) {
      newErrors.dividend_yield = 'Dividend yield must be between 0 and 100'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    setSubmitting(true)
    try {
      const submitData = {
        name: formData.name.trim(),
        brokerage_name: formData.brokerage_name,
        account_type: formData.account_type,
        current_balance: parseFloat(formData.current_balance),
        dividend_yield: formData.dividend_yield ? parseFloat(formData.dividend_yield) / 100 : null
      }

      await onSubmit(submitData)

      // Reset form if creating new account
      if (!account) {
        setFormData({
          name: '',
          brokerage_name: '',
          account_type: '',
          current_balance: '',
          dividend_yield: ''
        })
      }
    } catch (err) {
      console.error('Form submission error:', err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="account-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="name">Account Name *</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleChange}
          placeholder="e.g., My 401(k)"
          className={errors.name ? 'error' : ''}
        />
        {errors.name && <span className="error-message">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="brokerage_name">Brokerage *</label>
        <select
          id="brokerage_name"
          name="brokerage_name"
          value={formData.brokerage_name}
          onChange={handleChange}
          className={errors.brokerage_name ? 'error' : ''}
        >
          <option value="">Select brokerage</option>
          {BROKERAGES.map(brokerage => (
            <option key={brokerage} value={brokerage}>{brokerage}</option>
          ))}
        </select>
        {errors.brokerage_name && <span className="error-message">{errors.brokerage_name}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="account_type">Account Type *</label>
        <select
          id="account_type"
          name="account_type"
          value={formData.account_type}
          onChange={handleChange}
          className={errors.account_type ? 'error' : ''}
        >
          <option value="">Select account type</option>
          {ACCOUNT_TYPES.map(type => (
            <option key={type} value={type}>{type}</option>
          ))}
        </select>
        {errors.account_type && <span className="error-message">{errors.account_type}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="current_balance">Current Balance *</label>
        <input
          type="number"
          id="current_balance"
          name="current_balance"
          value={formData.current_balance}
          onChange={handleChange}
          placeholder="0.00"
          step="0.01"
          min="0"
          className={errors.current_balance ? 'error' : ''}
        />
        {errors.current_balance && <span className="error-message">{errors.current_balance}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="dividend_yield">Dividend Yield (%) (Optional)</label>
        <input
          type="number"
          id="dividend_yield"
          name="dividend_yield"
          value={formData.dividend_yield}
          onChange={handleChange}
          placeholder="0.00"
          step="0.01"
          min="0"
          max="100"
          className={errors.dividend_yield ? 'error' : ''}
        />
        {errors.dividend_yield && <span className="error-message">{errors.dividend_yield}</span>}
      </div>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Saving...' : account ? 'Update Account' : 'Create Account'}
        </button>
        {onCancel && (
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

export default AccountForm
