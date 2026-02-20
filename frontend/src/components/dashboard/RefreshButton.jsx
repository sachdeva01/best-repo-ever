import { useState } from 'react'
import './RefreshButton.css'

function RefreshButton({ onRefresh }) {
  const [refreshing, setRefreshing] = useState(false)

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      await onRefresh()
    } finally {
      setTimeout(() => setRefreshing(false), 1000)
    }
  }

  return (
    <button
      className={`refresh-button ${refreshing ? 'refreshing' : ''}`}
      onClick={handleRefresh}
      disabled={refreshing}
      title="Refresh dashboard data"
    >
      <span className="refresh-icon">🔄</span>
      <span className="refresh-text">{refreshing ? 'Refreshing...' : 'Refresh'}</span>
    </button>
  )
}

export default RefreshButton
