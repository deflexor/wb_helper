import { useMemo } from 'react';
import { AlertTriangle, TrendingUp, Clock, CheckCircle2, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';
import { ReturnsDataPoint } from '@/hooks/useReturnsForecast';

interface Recommendation {
  id: string;
  priority: 'high' | 'medium' | 'low';
  title: string;
  description: string;
  actionLabel: string;
  onAction?: () => void;
}

interface RecommendationsPanelProps {
  forecast: ReturnsDataPoint[];
  onApplyRecommendation?: (recommendationId: string) => void;
  className?: string;
}

// Pure function to analyze forecast data and generate recommendations
export const analyzeRecommendations = (
  forecast: ReturnsDataPoint[]
): Recommendation[] => {
  if (forecast.length === 0) return [];

  const recommendations: Recommendation[] = [];

  // Analyze high risk points
  const highRiskPoints = forecast.filter((p) => p.riskLevel === 'high');
  if (highRiskPoints.length > 0) {
    const avgReturns = highRiskPoints.reduce((sum, p) => sum + p.returns, 0) / highRiskPoints.length;
    recommendations.push({
      id: 'high-risk-returns',
      priority: 'high',
      title: t('returns_forecast.recommendations.highRiskTitle'),
      description: t('returns_forecast.recommendations.highRiskDesc', {
        count: highRiskPoints.length,
        avgReturns: avgReturns.toFixed(1),
      }),
      actionLabel: t('returns_forecast.recommendations.reviewReturns'),
    });
  }

  // Analyze medium risk trends
  const mediumRiskPoints = forecast.filter((p) => p.riskLevel === 'medium');
  if (mediumRiskPoints.length >= 3) {
    recommendations.push({
      id: 'medium-risk-monitor',
      priority: 'medium',
      title: t('returns_forecast.recommendations.monitorTitle'),
      description: t('returns_forecast.recommendations.monitorDesc', {
        count: mediumRiskPoints.length,
      }),
      actionLabel: t('returns_forecast.recommendations.setAlert'),
    });
  }

  // Low risk opportunities
  const lowRiskPoints = forecast.filter((p) => p.riskLevel === 'low');
  if (lowRiskPoints.length > 10) {
    recommendations.push({
      id: 'low-risk-opportunity',
      priority: 'low',
      title: t('returns_forecast.recommendations.opportunityTitle'),
      description: t('returns_forecast.recommendations.opportunityDesc', {
        count: lowRiskPoints.length,
      }),
      actionLabel: t('returns_forecast.recommendations.exploreProducts'),
    });
  }

  // Confidence-based recommendation
  const lowConfidencePoints = forecast.filter((p) => p.confidence < 0.7);
  if (lowConfidencePoints.length > 0) {
    recommendations.push({
      id: 'uncertain-forecast',
      priority: 'medium',
      title: t('returns_forecast.recommendations.uncertainTitle'),
      description: t('returns_forecast.recommendations.uncertainDesc', {
        count: lowConfidencePoints.length,
      }),
      actionLabel: t('returns_forecast.recommendations.reviewMethodology'),
    });
  }

  return recommendations;
};

const priorityConfig = {
  high: {
    icon: AlertTriangle,
    className: 'border-red-700/50 bg-red-950/30',
    iconClassName: 'text-red-400',
  },
  medium: {
    icon: Clock,
    className: 'border-yellow-700/50 bg-yellow-950/30',
    iconClassName: 'text-yellow-400',
  },
  low: {
    icon: TrendingUp,
    className: 'border-green-700/50 bg-green-950/30',
    iconClassName: 'text-green-400',
  },
};

const priorityOrder = { high: 0, medium: 1, low: 2 };

export function RecommendationsPanel({
  forecast,
  onApplyRecommendation,
  className,
}: RecommendationsPanelProps) {
  const recommendations = useMemo(
    () => analyzeRecommendations(forecast),
    [forecast]
  );

  const sortedRecommendations = useMemo(
    () =>
      [...recommendations].sort(
        (a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]
      ),
    [recommendations]
  );

  return (
    <Card className={cn('bg-black border-border', className)}>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[var(--neon-volt)]" />
          {t('returns_forecast.recommendations.title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sortedRecommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            {t('returns_forecast.recommendations.empty')}
          </p>
        ) : (
          sortedRecommendations.map((rec) => {
            const config = priorityConfig[rec.priority];
            const Icon = config.icon;

            return (
              <div
                key={rec.id}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border transition-colors hover:border-border/80',
                  config.className
                )}
              >
                <Icon className={cn('w-4 h-4 mt-0.5 shrink-0', config.iconClassName)} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{rec.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{rec.description}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="shrink-0 h-7 text-xs text-[var(--neon-volt)] hover:text-[var(--neon-pale)] hover:bg-[var(--neon-volt)]/10"
                  onClick={() => onApplyRecommendation?.(rec.id)}
                >
                  {rec.actionLabel}
                  <ChevronRight className="w-3 h-3 ml-1" />
                </Button>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}