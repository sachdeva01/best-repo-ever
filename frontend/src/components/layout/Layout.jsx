import { Outlet } from 'react-router-dom'
import Navigation from './Navigation'
import './Layout.css'

function Layout() {
  return (
    <div className="layout">
      <header className="layout-header">
        <h1 className="app-title">Portfolio Tracker</h1>
        <p className="app-subtitle">Capital Preservation Retirement Planning</p>
      </header>
      <Navigation />
      <main className="layout-content">
        <Outlet />
      </main>
    </div>
  )
}

export default Layout
