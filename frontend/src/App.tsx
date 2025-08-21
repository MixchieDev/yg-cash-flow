import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import Layout from './components/Layout'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Companies from './pages/Companies'
import BankAccounts from './pages/BankAccounts'
import Customers from './pages/Customers'
import ExpenseCategories from './pages/ExpenseCategories'
import RecurringIncome from './pages/RecurringIncome'
import RecurringExpense from './pages/RecurringExpense'
import Projections from './pages/Projections'
import OneOffItems from './pages/OneOffItems'
import Profile from './pages/Profile'

function App() {
  const { user } = useAuthStore()

  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <Routes>
          {!user ? (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : (
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="/companies" element={<Companies />} />
              <Route path="/bank-accounts" element={<BankAccounts />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/expense-categories" element={<ExpenseCategories />} />
              <Route path="/recurring-income" element={<RecurringIncome />} />
              <Route path="/recurring-expenses" element={<RecurringExpense />} />
              <Route path="/projections" element={<Projections />} />
              <Route path="/one-off-items" element={<OneOffItems />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
          )}
        </Routes>
      </div>
    </Router>
  )
}

export default App