import { useMemo } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';
import { PriceStatus } from '@/hooks/useCompetitorPrices';

interface PriceBadgeProps {
  status: PriceStatus;
  className?: string;
}

const statusConfig: Record<PriceStatus, { icon: React.ReactNode; className: string }> = {
  opportunity: {
    icon: <TrendingUp className="w-3 h-3" />,
    className: 'bg-green-900/50 text-green-400 border-green-700',
  },
  risk: {
    icon: <TrendingDown className="w-3 h-3" />,
    className: 'bg-red-900/50 text-red-400 border-red-700',
  },
  neutral: {
    icon: <Minus className="w-3 h-3" />,
    className: 'bg-gray-900/50 text-gray-400 border-gray-700',
  },
};

const statusLabels: Record<PriceStatus, () => string> = {
  opportunity: () => t('competitors.opportunity'),
  risk: () => t('competitors.risk'),
  neutral: () => t('competitors.priceSimilar'),
};

export function PriceBadge({ status, className }: PriceBadgeProps) {
  const config = statusConfig[status];
  const label = useMemo(() => statusLabels[status](), [status]);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium border',
        config.className,
        className
      )}
    >
      {config.icon}
      <span>{label}</span>
    </span>
  );
}
