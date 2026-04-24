import { PriceTable } from '@/components/features/competitors/PriceTable';
import { t } from '@/i18n';

export function CompetitorsPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white mb-2">
          {t('competitors.title')}
        </h1>
        <p className="text-sm text-gray-500">
          {t('competitors.title')} - {t('competitors.lastUpdated')}
        </p>
      </div>

      <PriceTable />
    </div>
  );
}
