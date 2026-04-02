import { useEffect } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'

import { useSessionStore } from '@/stores/sessionStore'
import { useUiStore } from '@/stores/uiStore'

export function ProtectedRoute() {
  const token = useSessionStore((s) => s.token)
  const clearQuotaState = useUiStore((s) => s.clearQuotaState)
  const clearUsageState = useUiStore((s) => s.clearUsageState)
  const location = useLocation()

  useEffect(() => {
    if (!token) {
      clearQuotaState()
      clearUsageState()
    }
  }, [token, clearQuotaState, clearUsageState])

  if (!token) return <Navigate to="/login" replace state={{ from: location.pathname }} />

  return <Outlet />
}
