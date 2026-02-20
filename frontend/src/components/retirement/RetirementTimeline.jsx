import './RetirementTimeline.css'

function RetirementTimeline({ calculation }) {
  if (!calculation) return null

  const milestones = [
    {
      age: calculation.current_age,
      label: 'Current Age',
      icon: '👤',
      status: 'current'
    },
    {
      age: calculation.withdrawal_start_age,
      label: 'Withdrawal Start',
      icon: '🎯',
      years: calculation.years_to_withdrawal,
      status: 'future'
    },
    {
      age: calculation.social_security_start_age,
      label: 'Social Security',
      icon: '💼',
      years: calculation.social_security_start_age - calculation.current_age,
      status: 'future'
    },
    {
      age: calculation.target_age,
      label: 'Target Age',
      icon: '🏆',
      years: calculation.target_age - calculation.current_age,
      status: 'target'
    }
  ]

  return (
    <div className="retirement-timeline">
      <h3>Retirement Timeline</h3>

      <div className="timeline">
        {milestones.map((milestone, index) => (
          <div key={milestone.age} className="timeline-item">
            <div className={`timeline-marker ${milestone.status}`}>
              <span className="marker-icon">{milestone.icon}</span>
              <span className="marker-age">{milestone.age}</span>
            </div>
            <div className="timeline-content">
              <h4>{milestone.label}</h4>
              {milestone.years !== undefined && (
                <p className="timeline-years">
                  {milestone.years} year{milestone.years !== 1 ? 's' : ''} from now
                </p>
              )}
            </div>
            {index < milestones.length - 1 && <div className="timeline-connector"></div>}
          </div>
        ))}
      </div>

      <div className="timeline-summary">
        <div className="summary-item">
          <span className="summary-label">Years Until Withdrawal</span>
          <span className="summary-value">{calculation.years_to_withdrawal}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Years in Retirement</span>
          <span className="summary-value">{calculation.years_in_retirement}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Years Before Social Security</span>
          <span className="summary-value">{calculation.years_before_social_security}</span>
        </div>
        <div className="summary-item">
          <span className="summary-label">Years With Social Security</span>
          <span className="summary-value">{calculation.years_with_social_security}</span>
        </div>
      </div>
    </div>
  )
}

export default RetirementTimeline
