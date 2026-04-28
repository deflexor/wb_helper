"use client";

import { memo } from "react";
import { Tags, Edit2, Merge, Trash2, Download } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MarketplaceBadge, type Marketplace } from "./MarketplaceBadge";

// =============================================================================
// TYPES
// =============================================================================

export interface ClusterKeyword {
  id: string;
  keyword: string;
  marketplace: Marketplace;
  similarity?: number;
}

export interface Cluster {
  id: string;
  name: string;
  keywords: ClusterKeyword[];
  totalKeywords: number;
  avgSimilarity?: number;
}

export interface ClusterCardProps {
  cluster: Cluster;
  isLoading?: boolean;
  onEditClick?: (cluster: Cluster) => void;
  onMergeClick?: (cluster: Cluster) => void;
  onDeleteClick?: (cluster: Cluster) => void;
  onExportClick?: (cluster: Cluster) => void;
  onKeywordClick?: (keyword: ClusterKeyword) => void;
  className?: string;
}

// =============================================================================
// SKELETON
// =============================================================================

function CardSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Skeleton className="h-5 w-5 rounded" />
            <Skeleton className="h-5 w-32" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-20 rounded-full" />
          ))}
        </div>
        <div className="flex gap-2 mt-4 pt-4 border-t border-border">
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
          <Skeleton className="h-8 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// KEYWORD PILL
// =============================================================================

interface KeywordPillProps {
  keyword: ClusterKeyword;
  onClick?: (keyword: ClusterKeyword) => void;
}

function KeywordPill({ keyword, onClick }: KeywordPillProps) {
  const handleClick = () => {
    onClick?.(keyword);
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium",
        "bg-muted hover:bg-muted/80 transition-colors",
        "border border-transparent hover:border-border",
        "cursor-pointer"
      )}
    >
      <span>{keyword.keyword}</span>
      <MarketplaceBadge marketplace={keyword.marketplace} size="sm" />
      {keyword.similarity !== undefined && (
        <span
          className={cn(
            "ml-1 px-1.5 py-0.5 rounded text-[10px] font-medium",
            keyword.similarity >= 0.8
              ? "bg-green-900/50 text-green-400 dark:bg-green-900/50 dark:text-green-400"
              : keyword.similarity >= 0.5
              ? "bg-amber-900/50 text-amber-300 dark:bg-amber-900/50 dark:text-amber-300"
              : "bg-red-900/50 text-red-400 dark:bg-red-900/50 dark:text-red-400"
          )}
        >
          {Math.round(keyword.similarity * 100)}%
        </span>
      )}
    </button>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const ClusterCard = memo(function ClusterCard({
  cluster,
  isLoading = false,
  onEditClick,
  onMergeClick,
  onDeleteClick,
  onExportClick,
  onKeywordClick,
  className,
}: ClusterCardProps) {
  if (isLoading) {
    return <CardSkeleton />;
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <Tags className="h-5 w-5 flex-shrink-0 text-primary" />
            <CardTitle className="text-base font-semibold truncate">
              {cluster.name}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {cluster.avgSimilarity !== undefined && (
              <span
                className={cn(
                  "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium",
                  cluster.avgSimilarity >= 0.8
                    ? "bg-green-900/50 text-green-400 dark:bg-green-900/50 dark:text-green-400"
                    : cluster.avgSimilarity >= 0.5
                    ? "bg-amber-900/50 text-amber-300 dark:bg-amber-900/50 dark:text-amber-300"
                    : "bg-red-900/50 text-red-400 dark:bg-red-900/50 dark:text-red-400"
                )}
              >
                {Math.round(cluster.avgSimilarity * 100)}% avg
              </span>
            )}
            <Badge variant="secondary" className="text-xs">
              {cluster.totalKeywords} keywords
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {/* Keyword Pills */}
        <div className="flex flex-wrap gap-2 min-h-[40px]">
          {cluster.keywords.length === 0 ? (
            <span className="text-sm text-muted-foreground italic">
              No keywords in this cluster
            </span>
          ) : (
            cluster.keywords.map((keyword) => (
              <KeywordPill
                key={keyword.id}
                keyword={keyword}
                onClick={onKeywordClick}
              />
            ))
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEditClick?.(cluster)}
            className="gap-1.5 h-8"
          >
            <Edit2 className="h-3 w-3" />
            Edit
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMergeClick?.(cluster)}
            className="gap-1.5 h-8"
          >
            <Merge className="h-3 w-3" />
            Merge
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDeleteClick?.(cluster)}
            className="gap-1.5 h-8 text-red-500 hover:text-red-400 hover:border-red-500/50"
          >
            <Trash2 className="h-3 w-3" />
            Delete
          </Button>
          <div className="flex-1" />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onExportClick?.(cluster)}
            className="gap-1.5 h-8"
          >
            <Download className="h-3 w-3" />
            Export
          </Button>
        </div>
      </CardContent>
    </Card>
  );
});

export { ClusterCard };
