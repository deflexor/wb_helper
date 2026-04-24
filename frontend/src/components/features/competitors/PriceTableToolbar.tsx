import { Search, RefreshCw, Download } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { t } from '@/i18n';

interface PriceTableToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  statusFilter: string;
  onStatusFilterChange: (value: string) => void;
  onRefresh: () => void;
  isFetching: boolean;
  onExport: () => void;
}

export function PriceTableToolbar({
  searchValue,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
  isFetching,
  onExport,
}: PriceTableToolbarProps) {
  const handleExport = () => {
    onExport();
  };

  return (
    <div className="flex flex-col sm:flex-row gap-3 mb-4">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <Input
          type="text"
          placeholder={t('competitors.productName')}
          value={searchValue}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 bg-[#0a0a0a] border-[rgba(65,65,65,0.8)]"
        />
      </div>

      <Select value={statusFilter} onValueChange={onStatusFilterChange}>
        <SelectTrigger className="w-full sm:w-[160px] bg-[#0a0a0a] border-[rgba(65,65,65,0.8)]">
          <SelectValue placeholder={t('common.filter')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('common.all') || 'All'}</SelectItem>
          <SelectItem value="opportunity">{t('competitors.opportunity')}</SelectItem>
          <SelectItem value="risk">{t('competitors.risk')}</SelectItem>
          <SelectItem value="neutral">{t('competitors.priceSimilar')}</SelectItem>
        </SelectContent>
      </Select>

      <div className="flex gap-2">
        <Button
          variant="outline"
          size="icon"
          onClick={onRefresh}
          disabled={isFetching}
          className="border-[rgba(65,65,65,0.8)] hover:bg-[#0a0a0a]"
          title={t('competitors.refreshData')}
        >
          <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
        </Button>

        <Button
          variant="outline"
          onClick={handleExport}
          className="border-[rgba(65,65,65,0.8)] hover:bg-[#0a0a0a]"
        >
          <Download className="w-4 h-4 mr-2" />
          {t('competitors.exportData')}
        </Button>
      </div>
    </div>
  );
}
