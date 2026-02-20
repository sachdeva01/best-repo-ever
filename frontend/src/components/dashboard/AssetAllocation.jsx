import { formatCurrency, formatPercentage } from '../../utils/formatters'
import './AssetAllocation.css'

function AssetAllocation({ allocation }) {
  if (!allocation || !allocation.allocation || allocation.allocation.length === 0) {
    return (
      <div className="asset-allocation">
        <h3>Asset Allocation</h3>
        <p className="no-data">No holdings data available. Add holdings to your accounts to see allocation.</p>
      </div>
    )
  }

  const colors = [
    '#2b6cb0', // blue
    '#48bb78', // green
    '#ed8936', // orange
    '#667eea', // purple
    '#f56565', // red
    '#38b2ac', // teal
  ]

  return (
    <div className="asset-allocation">
      <h3>Asset Allocation</h3>

      <div className="allocation-content">
        <div className="allocation-chart">
          <svg viewBox="0 0 200 200" className="pie-chart">
            {allocation.allocation.map((item, index) => {
              const percentage = item.percentage
              const startAngle = allocation.allocation
                .slice(0, index)
                .reduce((sum, i) => sum + i.percentage, 0) * 3.6
              const endAngle = startAngle + percentage * 3.6

              const startRad = (startAngle - 90) * (Math.PI / 180)
              const endRad = (endAngle - 90) * (Math.PI / 180)

              const x1 = 100 + 90 * Math.cos(startRad)
              const y1 = 100 + 90 * Math.sin(startRad)
              const x2 = 100 + 90 * Math.cos(endRad)
              const y2 = 100 + 90 * Math.sin(endRad)

              const largeArcFlag = percentage > 50 ? 1 : 0

              const pathData = [
                `M 100 100`,
                `L ${x1} ${y1}`,
                `A 90 90 0 ${largeArcFlag} 1 ${x2} ${y2}`,
                'Z'
              ].join(' ')

              return (
                <path
                  key={item.asset_type}
                  d={pathData}
                  fill={colors[index % colors.length]}
                  stroke="white"
                  strokeWidth="2"
                />
              )
            })}
          </svg>
          <div className="chart-center">
            <div className="total-label">Total</div>
            <div className="total-value">{formatCurrency(allocation.total_value)}</div>
          </div>
        </div>

        <div className="allocation-legend">
          {allocation.allocation.map((item, index) => (
            <div key={item.asset_type} className="legend-item">
              <div
                className="legend-color"
                style={{ backgroundColor: colors[index % colors.length] }}
              ></div>
              <div className="legend-content">
                <div className="legend-header">
                  <span className="legend-label">{item.asset_type}</span>
                  <span className="legend-percentage">
                    {formatPercentage(item.percentage, 1)}
                  </span>
                </div>
                <div className="legend-value">{formatCurrency(item.value)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default AssetAllocation
