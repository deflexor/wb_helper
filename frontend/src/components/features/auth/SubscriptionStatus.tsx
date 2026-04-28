import { useAuthStore } from '@/stores/authStore';
import { useUsageStore } from '@/stores/usageStore';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n';

interface SubscriptionStatusProps {
  onUpgrade?: () => void;
}

export function SubscriptionStatus({ onUpgrade }: SubscriptionStatusProps) {
  const { user } = useAuthStore();
  const { limits } = useUsageStore();

  const planLabels = {
    free: t('subscription.freePlan'),
    pro: t('subscription.proPlan'),
    enterprise: t('subscription.enterprisePlan'),
  };

  const plan = user?.subscriptionPlan ?? 'free';
  const planLabel = planLabels[plan];

  // Calculate API usage
  const apiUsed = limits.apiCalls;
  const apiLimit = user?.apiCallsLimit ?? limits.apiCallsLimit;
  const apiRemaining = Math.max(0, apiLimit - apiUsed);
  const apiUsagePercent = apiLimit > 0 ? (apiUsed / apiLimit) * 100 : 0;

  return (
    <div className="space-y-4 p-4 rounded-lg border border-border bg-card">
      {/* Plan display */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{t('subscription.currentPlan')}</p>
          <p className="text-lg font-semibold text-foreground">{planLabel}</p>
        </div>
        {plan === 'free' && onUpgrade && (
          <Button
            onClick={onUpgrade}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {t('subscription.upgrade')}
          </Button>
        )}
      </div>

      {/* API usage progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {t('subscription.used')}: {apiUsed.toLocaleString()}
          </span>
          <span className="text-muted-foreground">
            {t('subscription.remaining')}: {apiRemaining.toLocaleString()}
          </span>
        </div>
        <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${Math.min(100, apiUsagePercent)}%`,
              backgroundColor: apiUsagePercent > 90 ? '#ef4444' : apiUsagePercent > 70 ? '#eab308' : '#22c55e',
            }}
          />
        </div>
      </div>
    </div>
  );
}
