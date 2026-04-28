"use client";

import { memo, useState, useCallback } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, RefreshCw, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MarketplaceBadge } from "./MarketplaceBadge";

// =============================================================================
// TYPES
// =============================================================================

type Marketplace = "wildberries" | "ozon";

interface DroppedKeyword {
  id: string;
  keyword: string;
  previousPosition: number;
  currentPosition: number;
  droppedDate: string;
  status: "active" | "recovering" | "lost";
  article?: string;
  marketplace: Marketplace;
  recoveryAttempts?: number;
}

interface DroppedKeywordsAlertProps {
  keywords: DroppedKeyword[];
  isLoading?: boolean;
  onRecoverClick?: (keyword: DroppedKeyword) => void;
  onDismissClick?: (keyword: DroppedKeyword) => void;
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function getDropSeverity(
  previousPosition: number,
  currentPosition: number
): "critical" | "moderate" | "mild" {
  const drop = currentPosition - previousPosition;
  if (drop >= 10) return "critical";
  if (drop >= 5) return "moderate";
  return "mild";
}

function getStatusConfig(status: DroppedKeyword["status"]): {
  label: string;
  className: string;
} {
  switch (status) {
    case "active":
      return {
        label: "Active",
        className: "bg-blue-900/50 text-blue-400 border-blue-700",
      };
    case "recovering":
      return {
        label: "Recovering",
        className: "bg-amber-900/50 text-amber-300 border-amber-700 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-700",
      };
    case "lost":
      return {
        label: "Lost",
        className: "bg-red-900/50 text-red-400 border-red-700",
      };
  }
}

// =============================================================================
// SINGLE ALERT CARD
// =============================================================================

interface AlertCardProps {
  keyword: DroppedKeyword;
  onRecoverClick?: (keyword: DroppedKeyword) => void;
  onDismissClick?: (keyword: DroppedKeyword) => void;
}

const AlertCard = memo(function AlertCard({
  keyword,
  onRecoverClick,
  onDismissClick,
}: AlertCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const severity = getDropSeverity(keyword.previousPosition, keyword.currentPosition);
  const statusConfig = getStatusConfig(keyword.status);

  const handleRecover = useCallback(() => {
    onRecoverClick?.(keyword);
  }, [keyword, onRecoverClick]);

  const handleDismiss = useCallback(() => {
    onDismissClick?.(keyword);
  }, [keyword, onDismissClick]);

  const toggleExpand = useCallback(() => {
    setIsExpanded((e) => !e);
  }, []);

  return (
    <div
      className={cn(
        "rounded-lg border p-4 transition-all",
        severity === "critical" &&
          "bg-red-950/30 border-red-800/50 hover:border-red-700",
        severity === "moderate" &&
          "bg-orange-950/30 border-orange-800/50 hover:border-orange-700",
        severity === "mild" &&
          "bg-amber-950/30 border-amber-800/50 hover:border-amber-700 dark:bg-amber-950/30 dark:border-amber-800/50 dark:hover:border-amber-700"
      )}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle
              className={cn(
                "h-4 w-4 flex-shrink-0",
                severity === "critical" && "text-red-500",
                severity === "moderate" && "text-orange-500",
                severity === "mild" && "text-amber-500 dark:text-amber-400"
              )}
            />
            <span className="font-medium text-sm truncate">{keyword.keyword}</span>
            <MarketplaceBadge marketplace={keyword.marketplace} size="sm" />
          </div>

          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              <span className="font-medium text-foreground">
                #{keyword.previousPosition}
              </span>{" "}
              →{" "}
              <span className="font-medium text-red-400">
                #{keyword.currentPosition}
              </span>
            </span>
            <span>Dropped: {formatDate(keyword.droppedDate)}</span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span
            className={cn(
              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium border",
              statusConfig.className
            )}
          >
            {statusConfig.label}
          </span>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleDismiss}
            className="h-7 w-7 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Expandable Details */}
      <div className="mt-3 pt-3 border-t border-border/50">
        <button
          onClick={toggleExpand}
          className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {isExpanded ? (
            <>
              <ChevronUp className="h-3 w-3" />
              Hide details
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" />
              Show details
            </>
          )}
        </button>

        {isExpanded && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-xs text-muted-foreground block">
                  Article ID
                </span>
                <span className="font-mono text-xs">
                  {keyword.article || "N/A"}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">
                  Recovery Attempts
                </span>
                <span className="font-medium">
                  {keyword.recoveryAttempts ?? 0}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">
                  Position Drop
                </span>
                <span className="font-medium text-red-400">
                  -{keyword.currentPosition - keyword.previousPosition}
                </span>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">
                  Current Status
                </span>
                <span className="font-medium capitalize">{keyword.status}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                size="sm"
                onClick={handleRecover}
                disabled={keyword.status === "recovering"}
                className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <RefreshCw className="h-3 w-3" />
                Recover
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

// =============================================================================
// ALERT LIST SKELETON
// =============================================================================

function AlertListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="rounded-lg border p-4 space-y-3">
          <div className="flex items-start justify-between">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-3 w-32" />
            </div>
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <Skeleton className="h-8 w-full" />
        </div>
      ))}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const DroppedKeywordsAlert = memo(function DroppedKeywordsAlert({
  keywords,
  isLoading = false,
  onRecoverClick,
  onDismissClick,
  className,
}: DroppedKeywordsAlertProps) {
  // Sort by severity (critical first)
  const sortedKeywords = [...keywords].sort((a, b) => {
    const severityOrder: Record<string, number> = { critical: 0, moderate: 1, mild: 2 };
    return (
      severityOrder[getDropSeverity(a.previousPosition, a.currentPosition)] -
      severityOrder[getDropSeverity(b.previousPosition, b.currentPosition)]
    );
  });

  const criticalCount = sortedKeywords.filter(
    (k) => getDropSeverity(k.previousPosition, k.currentPosition) === "critical"
  ).length;

  const moderateCount = sortedKeywords.filter(
    (k) => getDropSeverity(k.previousPosition, k.currentPosition) === "moderate"
  ).length;

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            <CardTitle className="text-lg font-semibold">
              Dropped Keywords
            </CardTitle>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {criticalCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                <span className="text-red-400 font-medium">{criticalCount}</span>
              </span>
            )}
            {moderateCount > 0 && (
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-orange-400 font-medium">{moderateCount}</span>
              </span>
            )}
            <span className="text-muted-foreground">
              {keywords.length} total
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4">
        {isLoading ? (
          <AlertListSkeleton count={3} />
        ) : keywords.length === 0 ? (
          <div className="py-8 text-center">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-sm text-muted-foreground">
              No dropped keywords. Great job!
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedKeywords.map((keyword) => (
              <AlertCard
                key={keyword.id}
                keyword={keyword}
                onRecoverClick={onRecoverClick}
                onDismissClick={onDismissClick}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export { DroppedKeywordsAlert };
export type { DroppedKeywordsAlertProps, DroppedKeyword };
