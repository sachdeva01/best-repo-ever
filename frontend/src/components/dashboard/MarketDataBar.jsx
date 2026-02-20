import { formatCurrencyDetailed } from '../../utils/formatters'
import './MarketDataBar.css'

function MarketDataBar({ marketData }) {
  if (!marketData) return null

  const formatDate = (dateString) => {
    const date = new Date(dateString)
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    })
  }

  const indicators = [
    {
      label: '10-Year Treasury',
      value: marketData.treasury_10y?.value,
      suffix: '%',
      lastUpdated: marketData.treasury_10y?.last_updated
    },
    {
      label: 'S&P 500',
      value: marketData.sp500?.value,
      suffix: '',
      lastUpdated: marketData.sp500?.last_updated
    },
    {
      label: 'Nasdaq',
      value: marketData.nasdaq?.value,
      suffix: '',
      lastUpdated: marketData.nasdaq?.last_updated
    }
  ]

  const getLatestUpdate = () => {
    const times = indicators
      .map(i => i.lastUpdated)
      .filter(Boolean)
      .map(t => new Date(t))

    if (times.length === 0) return null

    const latest = new Date(Math.max(...times))
    return formatDate(latest)
  }

  return (
    <div className="market-data-bar">
      <div className="market-data-label">
        <span>📊 Market Data</span>
        {getLatestUpdate() && (
          <span className="last-update">Updated: {getLatestUpdate()}</span>
        )}
      </div>
      <div className="market-indicators">
        {indicators.map((indicator) => (
          <div key={indicator.label} className="market-indicator">
            <span className="indicator-label">{indicator.label}</span>
            <span className="indicator-value">
              {indicator.value ?
                `${indicator.value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}${indicator.suffix}`
                : 'N/A'}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default MarketDataBar
