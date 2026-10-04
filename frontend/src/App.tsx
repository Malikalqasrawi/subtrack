import { lazy, Suspense } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { useAuth } from './auth/useAuth'
import Layout from './components/Layout'
import ForgotPasswordPage from './pages/ForgotPasswordPage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import VerifyEmailPage from './pages/VerifyEmailPage'

// Signed-in pages are downloaded when first opened, so the sign-in page stays small.
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const SubscriptionsPage = lazy(() => import('./pages/SubscriptionsPage'))
const CalendarPage = lazy(() => import('./pages/CalendarPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))

/** Pages that need a signed-in user; everyone else is sent to the sign-in page. */
function ProtectedRoutes() {
  const { user } = useAuth()
  const location = useLocation()
  if (user === undefined) return <div className="splash"><span className="spinner" /></div>
  if (user === null) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return (
    <Layout>
      <Suspense fallback={<div className="splash"><span className="spinner" /></div>}>
        <Outlet />
      </Suspense>
    </Layout>
  )
}

/** Sign-in and sign-up pages; a signed-in user has no business here. */
function PublicRoutes() {
  const { user } = useAuth()
  if (user === undefined) return <div className="splash"><span className="spinner" /></div>
  if (user) return <Navigate to="/" replace />
  return <Outlet />
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicRoutes />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/verify" element={<VerifyEmailPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>
      <Route element={<ProtectedRoutes />}>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/subscriptions" element={<SubscriptionsPage />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
