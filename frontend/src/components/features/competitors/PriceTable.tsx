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
import { ChevronUp, ChevronDown } from 'lucide-react';
import { useCompetitorPrices, CompetitorPrice } from '@/hooks/useCompetitorPrices';
import { PriceTableToolbar } from './PriceTableToolbar';
import { PriceTableRow } from './PriceTableRow';
import { EmptyState } from './EmptyState';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { t } from '@/i18n';

const PAGE_SIZE = 20;

export function PriceTable() {
  const { data, isLoading, isFetching, error, refetch } = useCompetitorPrices();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredData = useMemo(() => {
    if (!data) return [];

    return data.filter((item) => {
      const matchesSearch = item.productName
        .toLowerCase()
        .includes(globalFilter.toLowerCase());
      const matchesStatus =
        statusFilter === 'all' || item.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [data, globalFilter, statusFilter]);

  const columns = useMemo<ColumnDef<CompetitorPrice>[]>(
    () => [
      {
        accessorKey: 'productName',
        header: () => (
          <span className="text-xs uppercase tracking-[1.4px] text-gray-500">
            {t('competitors.product')}
          </span>
        ),
        cell: (info) => info.getValue(),
      },
      {
        accessorKey: 'currentPrice',
        header: () => (
          <span className="text-xs uppercase tracking-[1.4px] text-gray-500">
            {t('competitors.currentPrice')}
          </span>
        ),
        cell: (info) => {
          const value = info.getValue() as number;
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(value);
        },
      },
      {
        accessorKey: 'competitorPrice',
        header: () => (
          <span className="text-xs uppercase tracking-[1.4px] text-gray-500">
            {t('competitors.competitorPrice')}
          </span>
        ),
        cell: (info) => {
          const value = info.getValue() as number;
          return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
          }).format(value);
        },
      },
      {
        accessorKey: 'gap',
        header: () => (
          <span className="text-xs uppercase tracking-[1.4px] text-gray-500">
            {t('competitors.gap')}
          </span>
        ),
        cell: (info) => {
          const value = info.getValue() as number;
          const isNegative = value < 0;
          const isPositive = value > 0;
          return (
            <span
              className={cn(
                'font-medium',
                isNegative && 'text-red-500',
                isPositive && 'text-green-500',
                !isNegative && !isPositive && 'text-gray-400'
              )}
            >
              {value > 0 ? '+' : ''}
              {new Intl.NumberFormat('en-US', {
                style: 'currency',
                currency: 'USD',
              }).format(value)}
            </span>
          );
        },
      },
      {
        accessorKey: 'status',
        header: () => (
          <span className="text-xs uppercase tracking-[1.4px] text-gray-500">
            {t('competitors.status')}
          </span>
        ),
        enableSorting: false,
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

    const headers = ['Product', 'Current Price', 'Competitor Price', 'Gap', 'Status'];
    const rows = filteredData.map((item) => [
      item.productName,
      item.currentPrice.toFixed(2),
      item.competitorPrice.toFixed(2),
      item.gap.toFixed(2),
      item.status,
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `competitor-prices-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [data, filteredData]);

  if (error) {
    return (
      <div className="text-center py-8 text-red-500">
        {t('common.error')}
      </div>
    );
  }

  return (
    <div className="w-full">
      <PriceTableToolbar
        searchValue={globalFilter}
        onSearchChange={setGlobalFilter}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onRefresh={refetch}
        isFetching={isFetching}
        onExport={handleExport}
      />

      <div className="overflow-x-auto -mx-4 px-4">
        <div className="inline-block min-w-full">
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filteredData.length === 0 ? (
            <EmptyState />
          ) : (
            <>
              <table className="w-full min-w-[600px]">
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} className="border-b border-[rgba(65,65,65,0.8)]">
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
                              <span className="text-gray-600">
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
                    <PriceTableRow
                      key={row.id}
                      product={row.original}
                      className={index % 2 === 0 ? 'bg-transparent' : 'bg-[#0a0a0a]'}
                    />
                  ))}
                </tbody>
              </table>

              <div className="flex items-center justify-between mt-4 py-3 border-t border-[rgba(65,65,65,0.8)]">
                <div className="text-sm text-gray-500">
                  {filteredData.length} {t('competitors.product')} • {t('common.page')} {table.getState().pagination.pageIndex + 1}
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="border-[rgba(65,65,65,0.8)] hover:bg-[#0a0a0a]"
                  >
                    {t('common.previous')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="border-[rgba(65,65,65,0.8)] hover:bg-[#0a0a0a]"
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
