import { Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LoginPage } from '@/pages/LoginPage'
import { MonitoringPage } from '@/pages/MonitoringPage'
import { PlaceholderToolPage } from '@/pages/PlaceholderToolPage'
import { PricingOptimizationPage } from '@/pages/PricingOptimizationPage'
import { RegisterPage } from '@/pages/RegisterPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<DashboardLayout />}>
          <Route index element={<Navigate to="/monitoring" replace />} />
          <Route path="monitoring" element={<MonitoringPage />} />
          <Route path="pricing" element={<PricingOptimizationPage />} />
          <Route path="seo" element={<PlaceholderToolPage tool="seo" />} />
          <Route path="returns" element={<PlaceholderToolPage tool="returns" />} />
          <Route path="niche" element={<PlaceholderToolPage tool="niche" />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
