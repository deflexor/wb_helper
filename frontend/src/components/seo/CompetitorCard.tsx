"use client";

import { memo } from "react";
import { User, TrendingUp, TrendingDown, Search, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MarketplaceBadge, type Marketplace } from "./MarketplaceBadge";

// =============================================================================
// TYPES
// =============================================================================

export interface CompetitorKeyword {
  keyword: string;
  competitorPosition: number;
  yourPosition?: number;
  volume?: number;
  difficulty?: "easy" | "medium" | "hard";
}

export interface Competitor {
  id: string;
  articleId: string;
  marketplace: Marketplace;
  keywords: CompetitorKeyword[];
  totalKeywords: number;
  overlap?: number; // Percentage of shared keywords
  isGaining?: boolean;
}

export interface CompetitorCardProps {
  competitor: Competitor;
  isLoading?: boolean;
  onFindGapsClick?: (competitor: Competitor) => void;
  onKeywordClick?: (keyword: CompetitorKeyword) => void;
  className?: string;
}

// =============================================================================
// HELPERS
// =============================================================================

function getPositionComparison(
  yourPos?: number,
  competitorPos?: number
): "winning" | "losing" | "not-ranked" | "equal" {
  if (yourPos === undefined || competitorPos === undefined) {
    return "not-ranked";
  }
  if (yourPos < competitorPos) return "winning";
  if (yourPos > competitorPos) return "losing";
  return "equal";
}

function getDifficultyColor(difficulty?: CompetitorKeyword["difficulty"]): string {
  switch (difficulty) {
    case "easy":
      return "bg-green-900/50 text-green-400 border-green-700";
    case "medium":
      return "bg-yellow-900/50 text-yellow-400 border-yellow-700";
    case "hard":
      return "bg-red-900/50 text-red-400 border-red-700";
    default:
      return "bg-muted text-muted-foreground border-transparent";
  }
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
            <Skeleton className="h-5 w-24" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
        <Skeleton className="h-9 w-full mt-4" />
      </CardContent>
    </Card>
  );
}

// =============================================================================
// KEYWORD ROW
// =============================================================================

interface KeywordRowProps {
  keyword: CompetitorKeyword;
  onClick?: (keyword: CompetitorKeyword) => void;
}

const KeywordRow = memo(function KeywordRow({ keyword, onClick }: KeywordRowProps) {
  const comparison = getPositionComparison(
    keyword.yourPosition,
    keyword.competitorPosition
  );

  return (
    <button
      onClick={() => onClick?.(keyword)}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2 rounded-lg",
        "hover:bg-muted/50 transition-colors",
        "text-left"
      )}
    >
      <div className="flex items-center gap-2 min-w-0">
        <span className="text-sm truncate">{keyword.keyword}</span>
        {keyword.difficulty && (
          <span
            className={cn(
              "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium border",
              getDifficultyColor(keyword.difficulty)
            )}
          >
            {keyword.difficulty}
          </span>
        )}
      </div>

      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Your Position */}
        <div className="flex items-center gap-1 text-xs">
          {keyword.yourPosition ? (
            <>
              <span className="text-muted-foreground">You:</span>
              <span
                className={cn(
                  "font-medium",
                  comparison === "winning" && "text-green-500",
                  comparison === "losing" && "text-red-500",
                  comparison === "equal" && "text-yellow-500"
                )}
              >
                #{keyword.yourPosition}
              </span>
            </>
          ) : (
            <span className="text-muted-foreground text-xs">Not ranked</span>
          )}
        </div>

        {/* Comparison Indicator */}
        {keyword.yourPosition !== undefined && (
          <div className="flex items-center">
            {comparison === "winning" && (
              <TrendingUp className="h-3 w-3 text-green-500" />
            )}
            {comparison === "losing" && (
              <TrendingDown className="h-3 w-3 text-red-500" />
            )}
          </div>
        )}

        {/* Competitor Position */}
        <span className="text-xs text-muted-foreground">
          #{keyword.competitorPosition}
        </span>
      </div>
    </button>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const CompetitorCard = memo(function CompetitorCard({
  competitor,
  isLoading = false,
  onFindGapsClick,
  onKeywordClick,
  className,
}: CompetitorCardProps) {
  // Calculate gap keywords (where competitor beats you or is ranked but you're not)
  const gapKeywords = competitor.keywords.filter(
    (kw) =>
      kw.yourPosition === undefined ||
      kw.competitorPosition < kw.yourPosition
  );

  const hasGaps = gapKeywords.length > 0;

  if (isLoading) {
    return <CardSkeleton />;
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0">
            <User className="h-5 w-5 flex-shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <CardTitle className="text-base font-semibold truncate">
                {competitor.articleId}
              </CardTitle>
              <span className="text-xs text-muted-foreground font-mono">
                Article ID
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <MarketplaceBadge marketplace={competitor.marketplace} />
            {competitor.isGaining !== undefined && (
              <Badge
                variant={competitor.isGaining ? "default" : "secondary"}
                className={cn(
                  "text-xs",
                  competitor.isGaining && "bg-blue-900/50 text-blue-400"
                )}
              >
                {competitor.isGaining ? "Gaining" : "Stable"}
              </Badge>
            )}
          </div>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center gap-4 mt-3 pt-3 border-t border-border/50 text-xs">
          <span className="text-muted-foreground">
            <span className="font-medium text-foreground">
              {competitor.totalKeywords}
            </span>{" "}
            ranking keywords
          </span>
          {competitor.overlap !== undefined && (
            <span className="text-muted-foreground">
              <span className="font-medium text-foreground">
                {competitor.overlap}%
              </span>{" "}
              overlap
            </span>
          )}
          {hasGaps && (
            <span className="flex items-center gap-1 text-amber-400">
              <AlertCircle className="h-3 w-3" />
              {gapKeywords.length} gaps found
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {/* Keyword List */}
        <div className="max-h-64 overflow-y-auto">
          {competitor.keywords.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">No keyword data available</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {competitor.keywords.slice(0, 10).map((keyword, index) => (
                <KeywordRow
                  key={`${keyword.keyword}-${index}`}
                  keyword={keyword}
                  onClick={onKeywordClick}
                />
              ))}
            </div>
          )}
          {competitor.keywords.length > 10 && (
            <div className="p-2 text-center border-t border-border/50">
              <span className="text-xs text-muted-foreground">
                +{competitor.keywords.length - 10} more keywords
              </span>
            </div>
          )}
        </div>

        {/* Find Gaps Button */}
        {hasGaps && onFindGapsClick && (
          <div className="p-4 border-t border-border">
            <Button
              onClick={() => onFindGapsClick?.(competitor)}
              className="w-full gap-2 bg-[#faff69] text-black hover:bg-[#faff69]/90"
            >
              <Search className="h-4 w-4" />
              Find {gapKeywords.length} Keyword Gaps
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export { CompetitorCard };
