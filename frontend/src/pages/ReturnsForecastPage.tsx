"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { TrendingUp, AlertTriangle, CheckCircle } from "lucide-react";
import { ForecastChart, type ForecastDataPoint } from "@/components/features/forecast/ForecastChart";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useReturnsForecast, calculateAverageReturns, type RiskLevel } from "@/hooks/useReturnsForecast";

/**
 * Convert forecast data to chart format
 */
const toChartData = (forecast: ReturnType<typeof useReturnsForecast>["forecast"]): ForecastDataPoint[] => {
  return forecast.map((point) => ({
    date: point.date,
    forecast: point.predictedReturns ?? point.returns,
    actual: point.returns,
  }));
};

// Helper to capitalize (defined before useMemo that uses it)
const capitalize = (s: string): string => {
  return s.charAt(0).toUpperCase() + s.slice(1);
};

/**
 * Get risk badge styling
 */
const getRiskBadge = (riskLevel: RiskLevel) => {
  switch (riskLevel) {
    case "high":
      return {
        bg: "bg-red-500/20",
        text: "text-red-400",
        icon: AlertTriangle,
        label: "high",
      };
    case "medium":
      return {
        bg: "bg-yellow-500/20",
        text: "text-yellow-400",
        icon: AlertTriangle,
        label: "medium",
      };
    case "low":
      return {
        bg: "bg-green-500/20",
        text: "text-green-400",
        icon: CheckCircle,
        label: "low",
      };
  }
};

/**
 * Calculate summary statistics
 */
const calculateStats = (forecast: ReturnType<typeof useReturnsForecast>["forecast"]) => {
  const avgReturns = calculateAverageReturns(forecast);
  const highRiskCount = forecast.filter((p) => p.riskLevel === "high").length;
  const mediumRiskCount = forecast.filter((p) => p.riskLevel === "medium").length;
  const lowRiskCount = forecast.filter((p) => p.riskLevel === "low").length;

  return {
    avgReturns,
    totalForecast: forecast.length,
    highRiskCount,
    mediumRiskCount,
    lowRiskCount,
  };
};

/**
 * Mock categories for filter
 */
const CATEGORIES = [
  { value: "all", labelKey: "common.all" },
  { value: "electronics", labelKey: "category.electronics" },
  { value: "clothing", labelKey: "category.clothing" },
  { value: "home", labelKey: "category.home" },
  { value: "sports", labelKey: "category.sports" },
];

export default function ReturnsForecastPage() {
  const { t } = useTranslation();

  const { forecast, isLoading, filters, setFilters } = useReturnsForecast();
  const chartData = useMemo(() => toChartData(forecast), [forecast]);
  const stats = useMemo(() => calculateStats(forecast), [forecast]);

  // Overview tab content
  const overviewContent = useMemo(() => {
    const lowBadge = getRiskBadge("low");
    const medBadge = getRiskBadge("medium");
    const highBadge = getRiskBadge("high");

    return (
      <div className="space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className="bg-card border border-border">
            <CardContent className="pt-6">
              <div className="text-2xl font-bold text-foreground">
                {stats.avgReturns.toFixed(1)}%
              </div>
              <p className="text-sm text-muted-foreground">{t("returns_forecast.avgReturns")}</p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <lowBadge.icon className={`h-5 w-5 ${lowBadge.text}`} />
                <span className={`text-xl font-bold ${lowBadge.text}`}>
                  {stats.lowRiskCount}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{t("returns_forecast.lowRisk")}</p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <medBadge.icon className={`h-5 w-5 ${medBadge.text}`} />
                <span className={`text-xl font-bold ${medBadge.text}`}>
                  {stats.mediumRiskCount}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{t("returns_forecast.mediumRisk")}</p>
            </CardContent>
          </Card>

          <Card className="bg-card border border-border">
            <CardContent className="pt-6">
              <div className="flex items-center gap-2">
                <highBadge.icon className={`h-5 w-5 ${highBadge.text}`} />
                <span className={`text-xl font-bold ${highBadge.text}`}>
                  {stats.highRiskCount}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{t("returns_forecast.highRisk")}</p>
            </CardContent>
          </Card>
        </div>

        {/* Main chart */}
        <Card className="bg-card border border-border">
          <CardHeader>
            <CardTitle className="text-foreground flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#faff69]" />
              {t("returns_forecast.forecastTrend")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="h-[300px] flex items-center justify-center">
                <p className="text-muted-foreground">{t("common.loading")}</p>
              </div>
            ) : (
              <ForecastChart
                data={chartData}
                dataKey="forecast"
                actualDataKey="actual"
                height={300}
                showGrid
                showAnimation
              />
            )}
          </CardContent>
        </Card>
      </div>
    );
  }, [stats, t, isLoading, chartData]);

  // Category tab content
  const categoryContent = useMemo(() => (
    <div className="space-y-6">
      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-foreground">
            {t("returns_forecast.categoryBreakdown")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {CATEGORIES.filter((c) => c.value !== "all").map((category) => (
              <div
                key={category.value}
                className="flex items-center justify-between p-4 rounded-lg bg-muted"
              >
                <span className="text-foreground">{t(category.labelKey)}</span>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <span className="text-xl font-bold text-foreground">
                      {(Math.random() * 10).toFixed(1)}%
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {t("returns_forecast.returnsRate")}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  ), [t]);

  // Product tab content
  const productContent = useMemo(() => (
    <div className="space-y-6">
      <Card className="bg-card border border-border">
        <CardHeader>
          <CardTitle className="text-foreground">
            {t("returns_forecast.topProducts")}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => {
              const riskLevels: RiskLevel[] = ["low", "medium", "high", "low", "medium"];
              const badge = getRiskBadge(riskLevels[i - 1]);
              const productNames = [
                t("returns_forecast.productWithIndex", { index: 1 }),
                t("returns_forecast.productWithIndex", { index: 2 }),
                t("returns_forecast.productWithIndex", { index: 3 }),
                t("returns_forecast.productWithIndex", { index: 4 }),
                t("returns_forecast.productWithIndex", { index: 5 }),
              ];

              return (
                <div
                  key={i}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted"
                >
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm">{i}</span>
                    <span className="text-foreground">{productNames[i - 1]}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-foreground font-medium">
                      {(Math.random() * 15 + 2).toFixed(1)}%
                    </span>
                    <span className={`px-2 py-1 rounded text-xs font-medium ${badge.bg} ${badge.text}`}>
                      {t(`returns_forecast.risk${capitalize(badge.label)}`)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  ), [t]);

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("returns_forecast.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("returns_forecast.subtitle")}
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="bg-card border border-border">
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Date range filter */}
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-2 block">
                {t("returns_forecast.dateRange")}
              </label>
              <Select
                value={filters.dateRange}
                onValueChange={(value) =>
                  setFilters({ dateRange: value as typeof filters.dateRange })
                }
              >
                <SelectTrigger className="bg-muted border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="7d">{t("returns_forecast.7days")}</SelectItem>
                  <SelectItem value="14d">{t("returns_forecast.14days")}</SelectItem>
                  <SelectItem value="30d">{t("returns_forecast.30days")}</SelectItem>
                  <SelectItem value="90d">{t("returns_forecast.90days")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Category filter */}
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-2 block">
                {t("returns_forecast.category")}
              </label>
              <Select
                value={filters.category}
                onValueChange={(value) => setFilters({ category: value })}
              >
                <SelectTrigger className="bg-muted border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {t(cat.labelKey)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Risk level filter */}
            <div className="flex-1">
              <label className="text-sm text-muted-foreground mb-2 block">
                {t("returns_forecast.riskLevel")}
              </label>
              <Select
                value={filters.riskLevel}
                onValueChange={(value) =>
                  setFilters({ riskLevel: value as typeof filters.riskLevel })
                }
              >
                <SelectTrigger className="bg-muted border-border text-foreground">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="all">{t("common.all")}</SelectItem>
                  <SelectItem value="low">{t("returns_forecast.lowRisk")}</SelectItem>
                  <SelectItem value="medium">{t("returns_forecast.mediumRisk")}</SelectItem>
                  <SelectItem value="high">{t("returns_forecast.highRisk")}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-card border border-border">
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-[#faff69] data-[state=active]:text-black"
          >
            {t("returns_forecast.overview")}
          </TabsTrigger>
          <TabsTrigger
            value="detailed"
            className="data-[state=active]:bg-[#faff69] data-[state=active]:text-black"
          >
            {t("returns_forecast.detailed")}
          </TabsTrigger>
          <TabsTrigger
            value="compare"
            className="data-[state=active]:bg-[#faff69] data-[state=active]:text-black"
          >
            {t("returns_forecast.compare")}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">{overviewContent}</TabsContent>
        <TabsContent value="detailed">{categoryContent}</TabsContent>
        <TabsContent value="compare">{productContent}</TabsContent>
      </Tabs>
    </div>
  );
}