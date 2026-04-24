import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout, ProtectedRoute } from './components/layout';
import { LoginPage, RegisterPage, CompetitorsPage } from './pages';
import OptimizationPage from './pages/OptimizationPage';
import SEOContentPage from './pages/SEOContentPage';
import ReturnsForecastPage from './pages/ReturnsForecastPage';
import NicheAnalysisPage from './pages/NicheAnalysisPage';

// Placeholder pages - to be implemented in subsequent tasks
function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-neon-volt">Dashboard</h1>
      <p className="mt-2 text-muted-foreground">
        Welcome to your seller optimizer dashboard.
      </p>
    </div>
  );
}

function HomePage() {
  return <Navigate to="/dashboard" replace />;
}

function SettingsPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold text-neon-volt">Settings</h1>
      <p className="mt-2 text-muted-foreground">
        Configure your account and application settings.
      </p>
    </div>
  );
}

export function AppRouter() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Protected routes with layout */}
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/competitors" element={<CompetitorsPage />} />
        <Route path="/optimization" element={<OptimizationPage />} />
        <Route path="/seo-content" element={<SEOContentPage />} />
        <Route path="/returns-forecast" element={<ReturnsForecastPage />} />
        <Route path="/niche-analysis" element={<NicheAnalysisPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
