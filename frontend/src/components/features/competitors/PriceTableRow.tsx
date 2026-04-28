import { cn } from '@/lib/utils';
import { PriceBadge } from './PriceBadge';
import { CompetitorPrice } from '@/hooks/useCompetitorPrices';

interface PriceTableRowProps {
  product: CompetitorPrice;
  className?: string;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export function PriceTableRow({ product, className }: PriceTableRowProps) {
  const isNegativeGap = product.gap < 0;
  const isPositiveGap = product.gap > 0;

  return (
    <tr className={cn('border-b border-border', className)}>
      <td className="px-4 py-3 text-sm text-muted-foreground font-medium">
        {product.productName}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {formatCurrency(product.currentPrice)}
      </td>
      <td className="px-4 py-3 text-sm text-muted-foreground">
        {formatCurrency(product.competitorPrice)}
      </td>
      <td className="px-4 py-3 text-sm">
        <span
          className={cn(
            'font-medium',
            isNegativeGap && 'text-red-500',
            isPositiveGap && 'text-green-500',
            !isNegativeGap && !isPositiveGap && 'text-muted-foreground'
          )}
        >
          {product.gap > 0 ? '+' : ''}
          {formatCurrency(product.gap)}
        </span>
      </td>
      <td className="px-4 py-3">
        <PriceBadge status={product.status} />
      </td>
    </tr>
  );
}
