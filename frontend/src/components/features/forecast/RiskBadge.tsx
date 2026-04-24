import { cn } from '@/lib/utils';
import { t } from '@/i18n';
import { RiskLevel } from '@/hooks/useReturnsForecast';

interface RiskBadgeProps {
  level: RiskLevel;
  className?: string;
}

const riskConfig: Record<RiskLevel, { className: string; labelKey: string }> = {
  low: {
    className: 'bg-green-900/50 text-green-400 border-green-700',
    labelKey: 'returns_forecast.riskLow',
  },
  medium: {
    className: 'bg-yellow-900/50 text-yellow-400 border-yellow-700',
    labelKey: 'returns_forecast.riskMedium',
  },
  high: {
    className: 'bg-red-900/50 text-red-400 border-red-700',
    labelKey: 'returns_forecast.riskHigh',
  },
};

export function RiskBadge({ level, className }: RiskBadgeProps) {
  const config = riskConfig[level];

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium border',
        config.className,
        className
      )}
    >
      {t(config.labelKey)}
    </span>
  );
}