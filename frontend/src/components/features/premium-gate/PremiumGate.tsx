import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuthStore, type PremiumFeature } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { Lock } from 'lucide-react';

interface PremiumGateProps {
  children: React.ReactNode;
  feature: PremiumFeature;
  blurIntensity?: number;
  showOverlay?: boolean;
}

// Feature label keys for translation
const FEATURE_LABEL_KEYS: Record<PremiumFeature, string> = {
  niche_analysis: 'premium.features.nicheAnalysis',
  returns_forecast: 'premium.features.returnsForecast',
  seo_content_generation: 'premium.features.seoContentGeneration',
  competitor_analysis_full: 'premium.features.competitorAnalysisFull',
};

export function PremiumGate({
  children,
  feature,
  blurIntensity = 8,
  showOverlay = true,
}: PremiumGateProps) {
  const { t } = useTranslation();
  const { isPremium, canAccess } = useAuthStore();

  const hasAccess = isPremium() || canAccess(feature);
  const featureLabel = t(FEATURE_LABEL_KEYS[feature]);

  const handleUpgrade = useCallback(() => {
    // Navigate to pricing/upgrade page - could use react-router or similar
    window.location.href = '/pricing';
  }, []);

  // If user has access, render children without any wrapping
  if (hasAccess) {
    return <>{children}</>;
  }

  // For free users, show blurred content with overlay
  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Blurred content */}
      <div
        className="pointer-events-none select-none"
        style={{
          filter: `blur(${blurIntensity}px)`,
          opacity: 0.5,
        }}
      >
        {children}
      </div>

      {/* Overlay with upgrade prompt */}
      {showOverlay && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="flex flex-col items-center gap-4 p-6 text-center max-w-md mx-auto">
            {/* Lock icon */}
            <div className="rounded-full bg-[#faff69]/10 p-4">
              <Lock className="h-8 w-8 text-[#faff69]" />
            </div>

            {/* Feature name */}
            <div className="space-y-1">
              <h3 className="text-xl font-semibold text-white">
                {t('premium.gate.premiumFeature')}
              </h3>
              <p className="text-sm text-muted-foreground">
                {featureLabel}
              </p>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground max-w-xs">
              {t('premium.gate.unlockDescription')}
            </p>

            {/* Upgrade button */}
            <Button
              onClick={handleUpgrade}
              className="bg-[#faff69] text-[#151515] hover:bg-[#faff69]/90 font-semibold px-6"
            >
              {t('premium.gate.upgradeToPro')}
            </Button>

            {/* Plan comparison link */}
            <p className="text-xs text-muted-foreground">
              {t('premium.gate.comparePlans')}{' '}
              <a
                href="/pricing"
                className="text-[#faff69] hover:underline"
                onClick={(e) => {
                  e.preventDefault();
                  handleUpgrade();
                }}
              >
                {t('premium.gate.viewPlans')}
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}