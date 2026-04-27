"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useMarketplace } from "@/components/MarketplaceProvider";
import { useSeoKeywords, type SeoKeyword } from "@/hooks/useSeoKeywords";
import { useSeoPositions, type KeywordPosition } from "@/hooks/useSeoPositions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PositionChart } from "@/components/seo/PositionChart";
import { Plus, Search, Filter, Eye } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface TrackingRowData extends SeoKeyword {
  currentPosition: number;
  change: number;
  lastUpdated: string;
}

// =============================================================================
// MOCK DATA TRANSFORMER
// =============================================================================

const transformToTrackingRows = (keywords: SeoKeyword[]): TrackingRowData[] => {
  return keywords.map((kw) => ({
    ...kw,
    currentPosition: Math.floor(Math.random() * 50) + 1,
    change: Math.floor(Math.random() * 10) - 5,
    lastUpdated: new Date().toISOString(),
  }));
};

// =============================================================================
// SUB-COMPONENTS (< 50 lines each)
// =============================================================================

interface HistoryModalProps {
  keywordId: number;
  keywordName: string;
  positions: KeywordPosition[];
  isLoading: boolean;
  onClose: () => void;
}

function HistoryModal({ keywordName, positions, isLoading, onClose }: HistoryModalProps) {
  const { t } = useTranslation();

  const chartData = useMemo(
    () => positions.map((p) => ({ date: p.date, position: p.position })),
    [positions]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <Card className="w-full max-w-2xl mx-4 max-h-[80vh] overflow-hidden flex flex-col">
        <CardHeader className="border-b border-border flex-shrink-0">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">{keywordName}</CardTitle>
            <Button variant="ghost" size="sm" onClick={onClose}>
              {t("common.close")}
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">{t("seo.tracking.positionHistory")}</p>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto pt-4">
          {isLoading ? (
            <div className="h-[300px] flex items-center justify-center">
              {t("common.loading")}
            </div>
          ) : (
            <PositionChart
              data={chartData}
              height={300}
              title={t("seo.tracking.positionOverTime")}
              showGrid
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <tr className="border-b border-border">
      <td className="py-3 px-4"><div className="h-4 w-32 bg-muted rounded" /></td>
      <td className="py-3 px-4"><div className="h-4 w-20 bg-muted rounded" /></td>
      <td className="py-3 px-4"><div className="h-4 w-12 bg-muted rounded" /></td>
      <td className="py-3 px-4"><div className="h-4 w-12 bg-muted rounded" /></td>
      <td className="py-3 px-4"><div className="h-4 w-16 bg-muted rounded" /></td>
      <td className="py-3 px-4"><div className="h-8 w-8 bg-muted rounded" /></td>
    </tr>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SeoTrackingPage() {
  const { t } = useTranslation();
  const { marketplace } = useMarketplace();

  // Filters state
  const [articleFilter, setArticleFilter] = useState<string>("all");
  const [positionRange, setPositionRange] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("30");
  const [searchQuery, setSearchQuery] = useState("");

  // Add keyword form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [newKeyword, setNewKeyword] = useState("");
  const [newArticleId, setNewArticleId] = useState("");

  // History modal state
  const [selectedKeyword, setSelectedKeyword] = useState<{
    id: number;
    name: string;
  } | null>(null);

  // Fetch keywords using hook
  const positionRangeFilter = useMemo(() => {
    if (positionRange === "top10") return { min: 0, max: 10 };
    if (positionRange === "top50") return { min: 0, max: 50 };
    return undefined;
  }, [positionRange]);

  const { keywords, isLoading, addKeyword } = useSeoKeywords({
    marketplace,
    articleId: articleFilter === "all" ? undefined : articleFilter,
    positionRange: positionRangeFilter,
  });

  // Transform keywords to tracking rows
  const trackingData = useMemo(
    () => transformToTrackingRows(keywords),
    [keywords]
  );

  // Filter by search query
  const filteredData = useMemo(() => {
    if (!searchQuery.trim()) return trackingData;
    const query = searchQuery.toLowerCase();
    return trackingData.filter(
      (row) =>
        row.keyword.toLowerCase().includes(query) ||
        row.articleId.toLowerCase().includes(query)
    );
  }, [trackingData, searchQuery]);

  // Fetch position history for selected keyword
  const { positions, isLoading: isLoadingHistory } = useSeoPositions({
    marketplace,
    keywordId: selectedKeyword?.id ?? 0,
  });

  // Handlers
  const handleViewHistory = useCallback((keyword: SeoKeyword) => {
    setSelectedKeyword({ id: keyword.id, name: keyword.keyword });
  }, []);

  const handleCloseModal = useCallback(() => {
    setSelectedKeyword(null);
  }, []);

  const handleAddKeyword = useCallback(async () => {
    if (!newKeyword.trim() || !newArticleId.trim()) return;
    await addKeyword(newKeyword.trim(), newArticleId.trim());
    setNewKeyword("");
    setNewArticleId("");
    setShowAddForm(false);
  }, [newKeyword, newArticleId, addKeyword]);

  // Format helpers
  const formatChange = useCallback((change: number) => {
    if (change > 0) return `+${change}`;
    if (change < 0) return `${change}`;
    return "0";
  }, []);

  const getChangeColor = useCallback((change: number) => {
    if (change > 0) return "text-green-500";
    if (change < 0) return "text-red-500";
    return "text-muted-foreground";
  }, []);

  const formatDate = useCallback((isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  }, []);

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("seo.tracking.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("seo.tracking.description")}
          </p>
        </div>
        <Button
          onClick={() => setShowAddForm(!showAddForm)}
          className="gap-2 bg-[#faff69] text-[#151515] hover:bg-[#faff69]/90"
        >
          <Plus className="h-4 w-4" />
          {t("seo.tracking.addKeyword")}
        </Button>
      </div>

      {/* Add Keyword Form */}
      {showAddForm && (
        <Card>
          <CardHeader className="pb-4">
            <CardTitle className="text-base">{t("seo.tracking.addNewKeyword")}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder={t("seo.tracking.keywordPlaceholder")}
                value={newKeyword}
                onChange={(e) => setNewKeyword(e.target.value)}
                className="flex-1"
              />
              <Input
                placeholder={t("seo.tracking.articlePlaceholder")}
                value={newArticleId}
                onChange={(e) => setNewArticleId(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleAddKeyword}
                disabled={!newKeyword.trim() || !newArticleId.trim()}
                className="bg-[#faff69] text-[#151515] hover:bg-[#faff69]/90"
              >
                {t("common.add")}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-4 items-end">
            {/* Search */}
            <div className="flex-1 min-w-[200px] space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Search className="h-4 w-4" />
                {t("seo.tracking.search")}
              </label>
              <Input
                placeholder={t("seo.tracking.searchPlaceholder")}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Article Filter */}
            <div className="w-full sm:w-[180px] space-y-2">
              <label className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                <Filter className="h-4 w-4" />
                {t("seo.tracking.filterByArticle")}
              </label>
              <Select value={articleFilter} onValueChange={setArticleFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("seo.tracking.allArticles")}</SelectItem>
                  <SelectItem value="art-001">Article 001</SelectItem>
                  <SelectItem value="art-002">Article 002</SelectItem>
                  <SelectItem value="art-003">Article 003</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Position Range Filter */}
            <div className="w-full sm:w-[180px] space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                {t("seo.tracking.positionRange")}
              </label>
              <Select value={positionRange} onValueChange={setPositionRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("seo.tracking.allPositions")}</SelectItem>
                  <SelectItem value="top10">{t("seo.tracking.top10")}</SelectItem>
                  <SelectItem value="top50">{t("seo.tracking.top50")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="w-full sm:w-[180px] space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                {t("seo.tracking.dateRange")}
              </label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">{t("seo.tracking.last7Days")}</SelectItem>
                  <SelectItem value="30">{t("seo.tracking.last30Days")}</SelectItem>
                  <SelectItem value="90">{t("seo.tracking.last90Days")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Keywords Table */}
      <Card>
        <CardHeader className="border-b border-border">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">
              {t("seo.tracking.keywordsTable")}
            </CardTitle>
            <span className="text-sm text-muted-foreground">
              {filteredData.length} {t("seo.tracking.keywords")}
            </span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">
                    {t("seo.table.keyword")}
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">
                    {t("seo.table.article")}
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">
                    {t("seo.table.currentPosition")}
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">
                    {t("seo.table.change")}
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">
                    {t("seo.table.lastUpdated")}
                  </th>
                  <th className="py-3 px-4 text-left text-sm font-medium text-muted-foreground">
                    {t("seo.table.actions")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <>
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                    <TableRowSkeleton />
                  </>
                ) : filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground">
                      {t("seo.tracking.noKeywords")}
                    </td>
                  </tr>
                ) : (
                  filteredData.map((row) => (
                    <tr
                      key={row.id}
                      className="border-b border-border hover:bg-muted/30 transition-colors"
                    >
                      <td className="py-3 px-4 font-medium">{row.keyword}</td>
                      <td className="py-3 px-4 text-muted-foreground">{row.articleId}</td>
                      <td className="py-3 px-4 font-semibold">#{row.currentPosition}</td>
                      <td className={`py-3 px-4 font-medium ${getChangeColor(row.change)}`}>
                        {formatChange(row.change)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground text-sm">
                        {formatDate(row.lastUpdated)}
                      </td>
                      <td className="py-3 px-4">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewHistory(row)}
                          className="gap-1"
                        >
                          <Eye className="h-4 w-4" />
                          {t("seo.tracking.viewHistory")}
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Position History Modal */}
      {selectedKeyword && (
        <HistoryModal
          keywordId={selectedKeyword.id}
          keywordName={selectedKeyword.name}
          positions={positions}
          isLoading={isLoadingHistory}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}