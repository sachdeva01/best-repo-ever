export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const formatCurrencyDetailed = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(amount)
}

export const formatPercentage = (value, decimals = 2) => {
  return `${value.toFixed(decimals)}%`
}

export const formatDate = (date) => {
  return new Intl.DateTimeFormat('en-US').format(new Date(date))
}
