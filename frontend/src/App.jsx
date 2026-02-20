import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import DashboardPage from './pages/DashboardPage'
import AccountsPage from './pages/AccountsPage'
import ExpensesPage from './pages/ExpensesPage'
import ExpenseTrackerPage from './pages/ExpenseTrackerPage'
import RetirementPage from './pages/RetirementPage'
import PortfolioManagementPage from './pages/PortfolioManagementPage'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="accounts" element={<AccountsPage />} />
          <Route path="expenses" element={<ExpensesPage />} />
          <Route path="expense-tracker" element={<ExpenseTrackerPage />} />
          <Route path="retirement" element={<RetirementPage />} />
          <Route path="portfolio-management" element={<PortfolioManagementPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
