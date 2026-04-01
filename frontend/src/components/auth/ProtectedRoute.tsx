import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useSessionStore } from '@/stores/sessionStore'

export function ProtectedRoute() {
  const token = useSessionStore((s) => s.token)
  const location = useLocation()

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }

  return <Outlet />
}
