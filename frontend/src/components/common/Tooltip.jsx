import { useState } from 'react'
import './Tooltip.css'

function Tooltip({ content, children }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className="tooltip-container">
      <span
        className="tooltip-trigger"
        onMouseEnter={() => setVisible(true)}
        onMouseLeave={() => setVisible(false)}
        onClick={() => setVisible(!visible)}
      >
        {children}
      </span>
      {visible && (
        <div className="tooltip-content">
          {content}
        </div>
      )}
    </div>
  )
}

export default Tooltip
