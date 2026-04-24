import { PackageX } from 'lucide-react';
import { t } from '@/i18n';

interface EmptyStateProps {
  className?: string;
}

export function EmptyState({ className }: EmptyStateProps) {
  return (
    <div className={className}>
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <div className="rounded-full bg-[#0a0a0a] p-4 mb-4">
          <PackageX className="w-8 h-8 text-gray-600" />
        </div>
        <h3 className="text-lg font-medium text-gray-200 mb-1">
          {t('common.noResults')}
        </h3>
        <p className="text-sm text-gray-500">
          {t('competitors.noCompetitors')}
        </p>
      </div>
    </div>
  );
}
