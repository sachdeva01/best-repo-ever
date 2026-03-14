import { NavLink, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import './Navigation.css'

function Navigation() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <nav className="navigation">
      <NavLink
        to="/dashboard"
        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
      >
        Dashboard
      </NavLink>
      <NavLink
        to="/summary"
        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
      >
        📊 Summary
      </NavLink>
      <NavLink
        to="/accounts"
        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
      >
        Accounts
      </NavLink>
      <NavLink
        to="/expense-tracker"
        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
      >
        Expenses
      </NavLink>
      <NavLink
        to="/retirement"
        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
      >
        Retirement
      </NavLink>
      <NavLink
        to="/portfolio-management"
        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
      >
        Portfolio Management
      </NavLink>
      <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {user && <span style={{ fontSize: '0.875rem', color: '#666' }}>{user.username}</span>}
        <button
          onClick={handleLogout}
          style={{
            padding: '0.35rem 0.85rem',
            borderRadius: 6,
            border: '1px solid #ddd',
            background: 'transparent',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          Sign out
        </button>
      </div>
    </nav>
  )
}

export default Navigation
