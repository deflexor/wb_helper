'use client';

import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useMarketplace } from '@/components/MarketplaceProvider';
import { useSeoDropped, DroppedKeyword as HookDroppedKeyword } from '@/hooks/useSeoDropped';
import { PremiumGate } from '@/components/features/premium-gate/PremiumGate';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, TrendingDown, RefreshCw, BarChart3 } from 'lucide-react';

// =============================================================================
// MOCK DATA
// =============================================================================

// Mock historical drop data for trend chart
const mockDropTrendData = [
  { date: '2026-04-20', dropped: 2, recovered: 1 },
  { date: '2026-04-21', dropped: 3, recovered: 0 },
  { date: '2026-04-22', dropped: 5, recovered: 2 },
  { date: '2026-04-23', dropped: 4, recovered: 1 },
  { date: '2026-04-24', dropped: 6, recovered: 3 },
  { date: '2026-04-25', dropped: 3, recovered: 1 },
  { date: '2026-04-26', dropped: 4, recovered: 2 },
];

// =============================================================================
// SUB-COMPONENTS (< 50 lines each)
// =============================================================================

interface DroppedKeywordCardProps {
  keyword: HookDroppedKeyword;
  onRecover: (keyword: HookDroppedKeyword) => Promise<void>;
  showSuggestions?: boolean;
  suggestions?: string[];
}

function DroppedKeywordCard({ keyword, onRecover, showSuggestions, suggestions = [] }: DroppedKeywordCardProps) {
  const { t } = useTranslation();

  const dropAmount = keyword.currentPosition - keyword.previousPosition;
  const isSevere = dropAmount > 20;

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
    });
  };

  const dropPercentage = keyword.dropPercentage;
  const recoveryDifficulty = keyword.recoveryDifficulty;

  return (
    <Card className={isSevere ? 'border-red-500/50 bg-red-900/5' : 'border-amber-500/50 bg-amber-900/5'}>
      <CardContent className="pt-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-foreground">{keyword.keyword}</h4>
              {isSevere && (
                <Badge variant="destructive" className="text-xs">
                  {t('seo.dropped.severe')}
                </Badge>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              {t('seo.dropped.article')}: {keyword.articleId}
            </p>
            <div className="flex items-center gap-4 pt-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t('seo.dropped.before')}:
                </span>
                <span className="font-semibold text-green-500">
                  #{keyword.previousPosition}
                </span>
              </div>
              <TrendingDown className="h-4 w-4 text-red-500" />
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {t('seo.dropped.after')}:
                </span>
                <span className="font-semibold text-red-500">
                  #{keyword.currentPosition}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground pt-1">
              {t('seo.dropped.droppedAt')}: {formatDate(keyword.dropDate)} ({dropPercentage}% drop)
            </p>
            <p className="text-xs text-muted-foreground">
              {t('seo.dropped.recoveryDifficulty')}: {t(`seo.dropped.${recoveryDifficulty}`)}
            </p>
            {showSuggestions && suggestions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-border">
                <p className="text-sm font-medium mb-2">{t('seo.dropped.suggestions')}:</p>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {suggestions.map((suggestion, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <span className="text-primary">•</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => { onRecover(keyword); }}
            className="gap-1 flex-shrink-0"
          >
            <RefreshCw className="h-4 w-4" />
            {t('seo.dropped.recover')}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SeoDroppedPage() {
  const { t } = useTranslation();
  const { marketplace } = useMarketplace();
  const { droppedKeywords, getRecoverySuggestions } = useSeoDropped({ marketplace });

  const [recoverySuggestions, setRecoverySuggestions] = useState<string[]>([]);
  const [isRecovering, setIsRecovering] = useState(false);
  const [selectedKeywordId, setSelectedKeywordId] = useState<number | null>(null);

  // Calculate stats
  const stats = useMemo(() => {
    const total = droppedKeywords.length;
    const severeCount = droppedKeywords.filter(
      (kw) => kw.currentPosition - kw.previousPosition > 20
    ).length;
    const recentDrops = droppedKeywords.filter((kw) => {
      const dropDate = new Date(kw.dropDate);
      const threeDaysAgo = new Date();
      threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
      return dropDate >= threeDaysAgo;
    }).length;

    return { total, severeCount, recentDrops };
  }, [droppedKeywords]);

  // Handler for recover action
  const handleRecover = useCallback(async (keyword: HookDroppedKeyword) => {
    setIsRecovering(true);
    setSelectedKeywordId(keyword.id);
    try {
      const suggestions = await getRecoverySuggestions(keyword.id);
      setRecoverySuggestions(suggestions);
    } catch {
      window.alert(t('seo.dropped.recoverError'));
    } finally {
      setIsRecovering(false);
    }
  }, [getRecoverySuggestions, t]);

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
    });
  };

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t('seo.dropped.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('seo.dropped.description')}
          </p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-red-500/30 bg-red-900/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-sm text-muted-foreground">
                  {t('seo.dropped.totalDropped')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-amber-500/30 bg-amber-900/10">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <TrendingDown className="h-8 w-8 text-amber-500" />
              <div>
                <div className="text-2xl font-bold">{stats.severeCount}</div>
                <p className="text-sm text-muted-foreground">
                  {t('seo.dropped.severeDrops')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <BarChart3 className="h-8 w-8 text-blue-500" />
              <div>
                <div className="text-2xl font-bold">{stats.recentDrops}</div>
                <p className="text-sm text-muted-foreground">
                  {t('seo.dropped.recentDrops')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Historical Trend */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-lg">{t('seo.dropped.dropTrend')}</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {/* Simple visual representation of trend */}
          <div className="flex items-end justify-between gap-2 h-[200px]">
            {mockDropTrendData.map((day) => (
              <div key={day.date} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col gap-1" style={{ height: '160px' }}>
                  <div
                    className="w-full bg-red-500/30 rounded-t"
                    style={{ height: `${String((day.dropped / 10) * 100)  }%` }}
                  />
                  <div
                    className="w-full bg-green-500/30 rounded-t"
                    style={{ height: `${String((day.recovered / 10) * 100)  }%` }}
                  />
                </div>
                <span className="text-xs text-muted-foreground">
                  {formatDate(day.date)}
                </span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-500/30" />
              <span className="text-xs text-muted-foreground">
                {t('seo.dropped.dropped')}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-500/30" />
              <span className="text-xs text-muted-foreground">
                {t('seo.dropped.recovered')}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Premium-gated Content: Dropped Keywords List */}
      <PremiumGate feature="seo_content_generation" showOverlay>
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {t('seo.dropped.keywordList')}
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {droppedKeywords.length} {t('seo.dropped.keywords')}
              </span>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            {isRecovering ? (
              <div className="flex items-center justify-center py-8">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <RefreshCw className="h-5 w-5 animate-spin" />
                  <span>{t('seo.dropped.analyzing')}</span>
                </div>
              </div>
            ) : (
              droppedKeywords.map((keyword) => (
                <DroppedKeywordCard
                  key={keyword.id}
                  keyword={keyword}
                  onRecover={handleRecover}
                  showSuggestions={selectedKeywordId === keyword.id && recoverySuggestions.length > 0}
                  suggestions={selectedKeywordId === keyword.id ? recoverySuggestions : []}
                />
              ))
            )}
          </CardContent>
        </Card>
      </PremiumGate>
    </div>
  );
}