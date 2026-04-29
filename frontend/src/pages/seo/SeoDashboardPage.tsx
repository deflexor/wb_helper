'use client';

import { useMemo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useMarketplace } from '@/components/MarketplaceProvider';
import { useSeoKeywords } from '@/hooks/useSeoKeywords';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PositionChart } from '@/components/seo/PositionChart';
import { AddKeywordModal } from '@/components/seo/AddKeywordModal';
import { Plus, AlertTriangle, Layers } from 'lucide-react';

// =============================================================================
// MOCK DATA (replace with actual TanStack Query hooks)
// =============================================================================

// Mock trend data for the chart
const generateTrendData = () => {
  const data = [];
  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    data.push({
      date: date.toISOString().split('T')[0],
      position: Math.floor(Math.random() * 30) + 5,
    });
  }
  return data;
};

// =============================================================================
// SUB-COMPONENTS (< 50 lines each)
// =============================================================================

function KeywordRowSkeleton() {
  return (
    <tr className="border-b border-border">
      <td className="py-3 px-4"><Skeleton className="h-4 w-32" /></td>
      <td className="py-3 px-4"><Skeleton className="h-4 w-16" /></td>
      <td className="py-3 px-4"><Skeleton className="h-4 w-12" /></td>
      <td className="py-3 px-4"><Skeleton className="h-4 w-12" /></td>
    </tr>
  );
}

function TrendChartSkeleton() {
  return (
    <Card>
      <CardHeader className="pb-3 border-b border-border">
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="pt-4">
        <Skeleton className="h-[300px] w-full" />
      </CardContent>
    </Card>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SeoDashboardPage() {
  const { t } = useTranslation();
  const { marketplace } = useMarketplace();
  const router = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { keywords, isLoading: isKeywordsLoading } = useSeoKeywords({ marketplace });

  const isLoading = isKeywordsLoading;
  const trendData = useMemo(() => generateTrendData(), []);
  const droppedCount = 12;

  // Map hook keywords to table format
  const topKeywords = keywords.map((kw) => ({
    id: kw.id,
    keyword: kw.keyword,
    articleId: kw.articleId,
    position: 0,
    change: 0,
  }));

  // Calculate summary stats
  const avgPosition = useMemo(() => {
    if (topKeywords.length === 0) return 0;
    return Math.round(
      topKeywords.reduce((sum, kw) => sum + kw.position, 0) / topKeywords.length
    );
  }, [topKeywords]);

  const improvingCount = useMemo(
    () => topKeywords.filter((kw) => kw.change > 0).length,
    [topKeywords]
  );

  const decliningCount = useMemo(
    () => topKeywords.filter((kw) => kw.change < 0).length,
    [topKeywords]
  );

  // Format change display
  const formatChange = useCallback((change: number) => {
    if (change > 0) return `+${  String(change)}`;
    if (change < 0) return String(change);
    return '0';
  }, []);

  // Get change color class
  const getChangeColor = useCallback((change: number) => {
    if (change > 0) return 'text-green-500';
    if (change < 0) return 'text-red-500';
    return 'text-muted-foreground';
  }, []);

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t('seo.dashboard.title')}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t('seo.dashboard.description')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => { router('/seo/dropped'); }}
          >
            <AlertTriangle className="h-4 w-4" />
            {t('seo.dashboard.checkDropped')}
          </Button>
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => { router('/seo/clusters'); }}
          >
            <Layers className="h-4 w-4" />
            {t('seo.dashboard.createCluster')}
          </Button>
          <Button
            className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => { setIsModalOpen(true); }}
          >
            <Plus className="h-4 w-4" />
            {t('seo.dashboard.addKeyword')}
          </Button>
        </div>
      </div>

      <AddKeywordModal open={isModalOpen} onOpenChange={setIsModalOpen} />

      {/* Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{avgPosition}</div>
            <p className="text-sm text-muted-foreground">{t('seo.dashboard.avgPosition')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-500">{improvingCount}</div>
            <p className="text-sm text-muted-foreground">{t('seo.dashboard.improving')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-500">{decliningCount}</div>
            <p className="text-sm text-muted-foreground">{t('seo.dashboard.declining')}</p>
          </CardContent>
        </Card>
        <Card className="bg-red-900/10 border-red-500/30">
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-400">{droppedCount}</div>
            <p className="text-sm text-muted-foreground">{t('seo.dashboard.droppedKeywords')}</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Position Trend Chart */}
        <div className="lg:col-span-2">
          {isLoading ? (
            <TrendChartSkeleton />
          ) : (
            <PositionChart
              data={trendData}
              height={350}
              title={t('seo.dashboard.positionTrends')}
              showGrid
              showAnimation
            />
          )}
        </div>

        {/* Quick Stats Sidebar */}
        <Card>
          <CardHeader className="border-b border-border">
            <CardTitle className="text-lg">{t('seo.dashboard.quickStats')}</CardTitle>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('seo.dashboard.totalKeywords')}</p>
              <p className="text-2xl font-bold">{topKeywords.length}</p>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{t('seo.dashboard.marketplace')}</p>
              <p className="text-lg font-medium capitalize">{marketplace}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Keywords Table */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-lg">{t('seo.dashboard.topKeywords')}</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">
                    {t('seo.table.keyword')}
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">
                    {t('seo.table.article')}
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">
                    {t('seo.table.position')}
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">
                    {t('seo.table.change')}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isKeywordsLoading ? (
                  <>
                    <KeywordRowSkeleton />
                    <KeywordRowSkeleton />
                    <KeywordRowSkeleton />
                  </>
                ) : (
                  topKeywords.map((kw) => (
                    <tr key={kw.id} className="border-b border-border hover:bg-muted/30 transition-colors cursor-pointer">
                      <td className="py-3 px-4 font-medium">{kw.keyword}</td>
                      <td className="py-3 px-4 text-muted-foreground">{kw.articleId}</td>
                      <td className="py-3 px-4 font-semibold">#{kw.position}</td>
                      <td className={`py-3 px-4 font-medium ${getChangeColor(kw.change)}`}>
                        {formatChange(kw.change)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}