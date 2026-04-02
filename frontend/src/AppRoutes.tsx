import { Navigate, Route, Routes } from 'react-router-dom'

import { ProtectedRoute } from '@/components/auth/ProtectedRoute'
import { DashboardLayout } from '@/components/layout/DashboardLayout'
import { LoginPage } from '@/pages/LoginPage'
import { MonitoringPage } from '@/pages/MonitoringPage'
import { NicheAnalysisPage } from '@/pages/NicheAnalysisPage'
import { PricingOptimizationPage } from '@/pages/PricingOptimizationPage'
import { ReturnsForecastPage } from '@/pages/ReturnsForecastPage'
import { SeoContentPage } from '@/pages/SeoContentPage'
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
          <Route path="seo" element={<SeoContentPage />} />
          <Route path="returns" element={<ReturnsForecastPage />} />
          <Route path="niche" element={<NicheAnalysisPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
