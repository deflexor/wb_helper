'use client';

import { memo, useState, useCallback } from 'react';
import {
  ChevronUp,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { MarketplaceBadge } from './MarketplaceBadge';

// =============================================================================
// TYPES
// =============================================================================

export type Marketplace = 'wildberries' | 'ozon';

export interface PositionHistoryEntry {
  date: string;
  position: number;
}

export interface KeywordData {
  id: string;
  keyword: string;
  article: string;
  position: number;
  previousPosition: number;
  lastUpdated: string;
  marketplace: Marketplace;
  positionHistory?: PositionHistoryEntry[];
}

export interface KeywordTableProps {
  keywords: KeywordData[];
  isLoading?: boolean;
  onKeywordClick?: (keyword: KeywordData) => void;
  onRecoverClick?: (keyword: KeywordData) => void;
  pageSize?: number;
  className?: string;
}

type SortField = 'keyword' | 'article' | 'position' | 'lastUpdated';
type SortDirection = 'asc' | 'desc';

// =============================================================================
// HELPERS
// =============================================================================

function getPositionChange(current: number, previous: number): {
  change: number;
  direction: 'up' | 'down' | 'neutral';
} {
  const change = previous - current; // Positive = improved (moved up)
  if (change > 0) return { change, direction: 'up' };
  if (change < 0) return { change: Math.abs(change), direction: 'down' };
  return { change: 0, direction: 'neutral' };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

// =============================================================================
// SKELETON
// =============================================================================

function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-4 w-28" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// CHANGE INDICATOR
// =============================================================================

const ChangeIndicator = memo(({
  direction,
  change,
}: {
  direction: 'up' | 'down' | 'neutral';
  change: number;
}) => {
  if (direction === 'neutral') {
    return (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <Minus className="h-3 w-3" />
        <span className="text-xs">0</span>
      </span>
    );
  }

  if (direction === 'up') {
    return (
      <span className="inline-flex items-center gap-1 text-green-500">
        <TrendingUp className="h-3 w-3" />
        <span className="text-xs">+{change}</span>
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 text-red-500">
      <TrendingDown className="h-3 w-3" />
      <span className="text-xs">-{change}</span>
    </span>
  );
});

// =============================================================================
// POSITION HISTORY DIALOG CONTENT
// =============================================================================

function PositionHistoryContent({
  history,
  keyword,
}: {
  history: PositionHistoryEntry[];
  keyword: string;
}) {
  if (history.length === 0) {
    return (
      <div className="py-8 text-center text-muted-foreground">
        No position history available
      </div>
    );
  }

  const sortedHistory = [...history].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="space-y-4">
      <h4 className="font-medium text-sm text-muted-foreground">
        Position history for &quot;{keyword}&quot;
      </h4>
      <div className="space-y-2">
        {sortedHistory.map((entry, index) => {
          const prevPosition =
            index > 0 ? sortedHistory[index - 1].position : entry.position;
          const { direction } = getPositionChange(entry.position, prevPosition);

          return (
            <div
              key={entry.date}
              className="flex items-center justify-between py-2 border-b border-border last:border-0"
            >
              <span className="text-sm text-muted-foreground">
                {formatDate(entry.date)}
              </span>
              <div className="flex items-center gap-3">
                <span className="font-medium">#{entry.position}</span>
                {index > 0 && <ChangeIndicator direction={direction} change={Math.abs(entry.position - prevPosition)} />}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const KeywordTable = memo(({
  keywords,
  isLoading = false,
  onKeywordClick,
  onRecoverClick,
  pageSize = 10,
  className,
}: KeywordTableProps) => {
  const [sortField, setSortField] = useState<SortField>('position');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedHistory, setSelectedHistory] = useState<{
    keyword: KeywordData;
    open: boolean;
  } | null>(null);

  // Sort handler
  const handleSort = useCallback(
    (field: SortField) => {
      if (sortField === field) {
        setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortField(field);
        setSortDirection('asc');
      }
    },
    [sortField]
  );

  // Sort keywords
  const sortedKeywords = [...keywords].sort((a, b) => {
    let comparison = 0;
    switch (sortField) {
      case 'keyword':
        comparison = a.keyword.localeCompare(b.keyword);
        break;
      case 'article':
        comparison = a.article.localeCompare(b.article);
        break;
      case 'position':
        comparison = a.position - b.position;
        break;
      case 'lastUpdated':
        comparison =
          new Date(a.lastUpdated).getTime() - new Date(b.lastUpdated).getTime();
        break;
    }
    return sortDirection === 'asc' ? comparison : -comparison;
  });

  // Pagination
  const totalPages = Math.ceil(sortedKeywords.length / pageSize);
  const paginatedKeywords = sortedKeywords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const handlePreviousPage = useCallback(() => {
    setCurrentPage((p) => Math.max(1, p - 1));
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((p) => Math.min(totalPages, p + 1));
  }, [totalPages]);

  const handleRowClick = useCallback(
    (keyword: KeywordData) => {
      if (onKeywordClick) {
        onKeywordClick(keyword);
      } else if (keyword.positionHistory) {
        setSelectedHistory({ keyword, open: true });
      }
    },
    [onKeywordClick]
  );

  const handleRecoverClick = useCallback(
    (e: React.MouseEvent, keyword: KeywordData) => {
      e.stopPropagation();
      onRecoverClick?.(keyword);
    },
    [onRecoverClick]
  );

  // Sort icon component
  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) {
      return <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-50" />;
    }
    return sortDirection === 'asc' ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  };

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">Keyword Rankings</CardTitle>
          <span className="text-sm text-muted-foreground">
            {keywords.length} keywords
          </span>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted/50">
              <tr>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-colors group"
                  onClick={() => { handleSort('keyword'); }}
                >
                  <span className="inline-flex items-center gap-1">
                    Keyword
                    <SortIcon field="keyword" />
                  </span>
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-colors group"
                  onClick={() => { handleSort('article'); }}
                >
                  <span className="inline-flex items-center gap-1">
                    Article
                    <SortIcon field="article" />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Marketplace
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-colors group"
                  onClick={() => { handleSort('position'); }}
                >
                  <span className="inline-flex items-center gap-1">
                    Position
                    <SortIcon field="position" />
                  </span>
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Change
                </th>
                <th
                  className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider cursor-pointer hover:bg-muted transition-colors group"
                  onClick={() => { handleSort('lastUpdated'); }}
                >
                  <span className="inline-flex items-center gap-1">
                    Last Updated
                    <SortIcon field="lastUpdated" />
                  </span>
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-6">
                    <TableSkeleton rows={pageSize} />
                  </td>
                </tr>
              ) : paginatedKeywords.length === 0 ? (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No keywords found
                  </td>
                </tr>
              ) : (
                paginatedKeywords.map((keyword) => {
                  const { change, direction } = getPositionChange(
                    keyword.position,
                    keyword.previousPosition
                  );
                  const hasDropped = keyword.position > keyword.previousPosition;

                  return (
                    <tr
                      key={keyword.id}
                      className="hover:bg-muted/30 cursor-pointer transition-colors"
                      onClick={() => { handleRowClick(keyword); }}
                    >
                      <td className="px-4 py-3">
                        <span className="font-medium text-sm">{keyword.keyword}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground font-mono">
                          {keyword.article}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <MarketplaceBadge marketplace={keyword.marketplace} />
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            'font-semibold',
                            keyword.position <= 3
                              ? 'text-green-500'
                              : keyword.position <= 10
                                ? 'text-yellow-500'
                                : 'text-foreground'
                          )}
                        >
                          #{keyword.position}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <ChangeIndicator direction={direction} change={change} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(keyword.lastUpdated)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {hasDropped && onRecoverClick && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => { handleRecoverClick(e, keyword); }}
                            className="text-xs h-7"
                          >
                            Recover
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {!isLoading && paginatedKeywords.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <span className="text-sm text-muted-foreground">
              Showing {(currentPage - 1) * pageSize + 1} to{' '}
              {Math.min(currentPage * pageSize, keywords.length)} of{' '}
              {keywords.length}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handlePreviousPage}
                disabled={currentPage === 1}
                className="h-8 w-8"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium">
                {currentPage} / {totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                onClick={handleNextPage}
                disabled={currentPage === totalPages}
                className="h-8 w-8"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}

        {/* Position History Dialog */}
        {selectedHistory && selectedHistory.open && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <div className="bg-card rounded-lg shadow-xl p-6 max-w-md w-full mx-4 border border-border">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Position History</h3>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => { setSelectedHistory((s) => (s ? { ...s, open: false } : null)); }
                  }
                  className="h-8 w-8"
                >
                  ×
                </Button>
              </div>
              <PositionHistoryContent
                history={selectedHistory.keyword.positionHistory ?? []}
                keyword={selectedHistory.keyword.keyword}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export { KeywordTable };
