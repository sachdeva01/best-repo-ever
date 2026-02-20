import { NavLink } from 'react-router-dom'
import './Navigation.css'

function Navigation() {
  return (
    <nav className="navigation">
      <NavLink
        to="/dashboard"
        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
      >
        Dashboard
      </NavLink>
      <NavLink
        to="/accounts"
        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
      >
        Accounts
      </NavLink>
      <NavLink
        to="/expenses"
        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
      >
        Expenses
      </NavLink>
      <NavLink
        to="/expense-tracker"
        className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}
      >
        Expense Tracker
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
    </nav>
  )
}

export default Navigation
