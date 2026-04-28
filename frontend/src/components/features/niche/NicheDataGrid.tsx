import { useState, useMemo, useCallback } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import { ChevronUp, ChevronDown, Search, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

export interface NicheData {
  id: string;
  product: string;
  category: string;
  demandScore: number;
  competitionLevel: 'low' | 'medium' | 'high';
  trend: 'up' | 'down' | 'stable';
}

interface NicheDataGridProps {
  data: NicheData[];
  isLoading?: boolean;
}

const PAGE_SIZE = 20;

export function NicheDataGrid({ data, isLoading }: NicheDataGridProps) {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [competitionFilter, setCompetitionFilter] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  const filteredData = useMemo(() => {
    if (!data) return [];

    return data.filter((item) => {
      const matchesSearch =
        item.product.toLowerCase().includes(globalFilter.toLowerCase()) ||
        item.category.toLowerCase().includes(globalFilter.toLowerCase());
      const matchesCompetition =
        competitionFilter === 'all' || item.competitionLevel === competitionFilter;
      return matchesSearch && matchesCompetition;
    });
  }, [data, globalFilter, competitionFilter]);

  const columns = useMemo<ColumnDef<NicheData>[]>(
    () => [
      {
        accessorKey: 'product',
        header: () => (
          <span className="text-xs uppercase tracking-[1.4px] text-muted-foreground">
            {t('niche.product')}
          </span>
        ),
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: 'category',
        header: () => (
          <span className="text-xs uppercase tracking-[1.4px] text-muted-foreground">
            {t('niche.category')}
          </span>
        ),
        cell: (info) => (
          <span className="px-2 py-1 rounded bg-muted text-xs">{String(info.getValue())}</span>
        ),
      },
      {
        accessorKey: 'demandScore',
        header: () => (
          <span className="text-xs uppercase tracking-[1.4px] text-muted-foreground">
            {t('niche.demandScore')}
          </span>
        ),
        cell: (info) => {
          const value = info.getValue() as number;
          const getScoreColor = (score: number) => {
            if (score >= 70) return 'text-green-500';
            if (score >= 40) return 'text-yellow-500';
            return 'text-red-500';
          };
          return (
            <div className="flex items-center gap-2">
              <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn('h-full rounded-full', getScoreColor(value).replace('text-', 'bg-'))}
                  style={{ width: `${value}%` }}
                />
              </div>
              <span className={cn('font-medium', getScoreColor(value))}>{value}</span>
            </div>
          );
        },
        sortingFn: 'basic',
      },
      {
        accessorKey: 'competitionLevel',
        header: () => (
          <span className="text-xs uppercase tracking-[1.4px] text-muted-foreground">
            {t('niche.competitionLevel')}
          </span>
        ),
        cell: (info) => {
          const value = info.getValue() as 'low' | 'medium' | 'high';
          const config = {
            low: { label: t('niche.competitionLow'), className: 'bg-green-500/20 text-green-500' },
            medium: { label: t('niche.competitionMedium'), className: 'bg-yellow-500/20 text-yellow-500' },
            high: { label: t('niche.competitionHigh'), className: 'bg-red-500/20 text-red-500' },
          };
          return (
            <span className={cn('px-2 py-1 rounded text-xs font-medium', config[value].className)}>
              {config[value].label}
            </span>
          );
        },
      },
      {
        accessorKey: 'trend',
        header: () => (
          <span className="text-xs uppercase tracking-[1.4px] text-muted-foreground">
            {t('niche.trend')}
          </span>
        ),
        cell: (info) => {
          const value = info.getValue() as 'up' | 'down' | 'stable';
          const config = {
            up: { icon: TrendingUp, className: 'text-green-500' },
            down: { icon: TrendingDown, className: 'text-red-500' },
            stable: { icon: Minus, className: 'text-muted-foreground' },
          };
          const Icon = config[value].icon;
          return (
            <Icon className={cn('w-4 h-4', config[value].className)} />
          );
        },
        enableSorting: true,
      },
    ],
    []
  );

  const table = useReactTable({
    data: filteredData,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: {
        pageSize: PAGE_SIZE,
      },
    },
    autoResetPageIndex: false,
  });

  const handleExport = useCallback(() => {
    if (!data) return;

    const headers = ['Product', 'Category', 'Demand Score', 'Competition Level', 'Trend'];
    const rows = filteredData.map((item) => [
      item.product,
      item.category,
      item.demandScore.toString(),
      item.competitionLevel,
      item.trend,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `niche-data-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [data, filteredData]);

  const competitionOptions = [
    { value: 'all', label: t('common.all') },
    { value: 'low', label: t('niche.competitionLow') },
    { value: 'medium', label: t('niche.competitionMedium') },
    { value: 'high', label: t('niche.competitionHigh') },
  ] as const;

  return (
    <div className="w-full">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            type="text"
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            placeholder={t('niche.searchPlaceholder')}
            className="w-full pl-10 pr-4 py-2 bg-muted border border-border rounded-md text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={competitionFilter}
            onChange={(e) => setCompetitionFilter(e.target.value as typeof competitionFilter)}
            className="px-3 py-2 bg-muted border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {competitionOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExport}
            className="border-border hover:bg-muted"
          >
            {t('niche.export')}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-4 px-4">
        <div className="inline-block min-w-full">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t('common.noResults')}
            </div>
          ) : (
            <>
              <table className="w-full min-w-[700px]">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-border">
                      {headerGroup.headers.map((header) => (
                        <th
                          key={header.id}
                          className={cn(
                            'px-4 py-3 text-left',
                            header.column.getCanSort() && 'cursor-pointer select-none'
                          )}
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          <div className="flex items-center gap-2">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {header.column.getCanSort() && (
                              <span className="text-muted-foreground">
                                {header.column.getIsSorted() === 'asc' ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : header.column.getIsSorted() === 'desc' ? (
                                  <ChevronDown className="w-3 h-3" />
                                ) : null}
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row, index) => (
                    <tr
                      key={row.id}
                      className={cn(
                        'border-b border-border/40 transition-colors hover:bg-muted',
                        index % 2 === 0 ? 'bg-transparent' : 'bg-muted/30'
                      )}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td
                          key={cell.id}
                          className="px-4 py-3 text-sm"
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>

              {/* Pagination */}
              <div className="flex items-center justify-between mt-4 py-3 border-t border-border">
                <div className="text-sm text-muted-foreground">
                  {filteredData.length} {t('niche.items')} • {t('common.page')} {table.getState().pagination.pageIndex + 1}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="border-border hover:bg-muted"
                  >
                    {t('common.previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="border-border hover:bg-muted"
                  >
                    {t('common.next')}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}