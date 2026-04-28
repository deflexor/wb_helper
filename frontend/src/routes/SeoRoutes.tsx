import { Route, Outlet } from 'react-router-dom';
import { MarketplaceProvider } from '@/components/MarketplaceProvider';
import { PremiumGate } from '@/components/features/premium-gate/PremiumGate';

// SEO Module pages (directly imported - not lazy loaded)
import SeoDashboardPage from '@/pages/seo/SeoDashboardPage';
import SeoTrackingPage from '@/pages/seo/SeoTrackingPage';
import SeoDroppedPage from '@/pages/seo/SeoDroppedPage';
import SeoClustersPage from '@/pages/seo/SeoClustersPage';
import SeoCompetitorPage from '@/pages/seo/SeoCompetitorPage';

/**
 * SEO Layout with MarketplaceProvider context
 * Uses Outlet from react-router to render child routes
 */
function SeoLayout() {
  return (
    <MarketplaceProvider>
      <Outlet />
    </MarketplaceProvider>
  );
}

/**
 * SEO Routes configuration
 * All routes are wrapped with MarketplaceProvider for marketplace context
 * Advanced features (/dropped, /clusters) are protected by PremiumGate
 */
export const seoRoutes = (
  <Route path="seo" element={<SeoLayout />}>
    <Route path="dashboard" element={<SeoDashboardPage />} />
    <Route path="tracking" element={<SeoTrackingPage />} />
    <Route
      path="dropped"
      element={
        <PremiumGate feature="seo_content_generation">
          <SeoDroppedPage />
        </PremiumGate>
      }
    />
    <Route
      path="clusters"
      element={
        <PremiumGate feature="seo_content_generation">
          <SeoClustersPage />
        </PremiumGate>
      }
    />
    <Route
      path="competitor"
      element={
        <PremiumGate feature="competitor_analysis_full">
          <SeoCompetitorPage />
        </PremiumGate>
      }
    />
  </Route>
);