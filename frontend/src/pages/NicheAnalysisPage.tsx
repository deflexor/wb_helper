"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { SlidersHorizontal } from "lucide-react";
import { NicheDataGrid, type NicheData } from "@/components/features/niche/NicheDataGrid";
import { NicheCharts } from "@/components/features/niche/NicheCharts";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useNicheAnalysis, getUniqueCategories, type CompetitionLevel } from "@/hooks/useNicheAnalysis";

// Map hook data to grid/charts format
const mapToNicheData = (data: ReturnType<typeof useNicheAnalysis>["data"]): NicheData[] => {
  return data.map((item) => ({
    id: item.id,
    product: item.productName,
    category: item.category,
    demandScore: item.demandScore,
    competitionLevel: item.competitionLevel,
    trend: item.trendDirection,
  }));
};

export default function NicheAnalysisPage() {
  const { t } = useTranslation();
  const { data, isLoading, filters, setFilters } = useNicheAnalysis();

  // Local filter state for sidebar controls
  const [categoryFilter, setCategoryFilter] = useState<string>("");
  const [demandMin, setDemandMin] = useState<number>(filters.minDemand);
  const [demandMax, setDemandMax] = useState<number>(filters.maxDemand);
  const [competitionFilters, setCompetitionFilters] = useState<CompetitionLevel[]>(filters.competitionLevels);

  // Get unique categories for dropdown
  const categories = useMemo(() => getUniqueCategories(data), [data]);

  // Map hook data to component format
  const nicheData = useMemo(() => mapToNicheData(data), [data]);

  // Handle apply filters
  const handleApplyFilters = useCallback(() => {
    setFilters({
      category: categoryFilter || null,
      minDemand: demandMin,
      maxDemand: demandMax,
      competitionLevels: competitionFilters,
    });
  }, [categoryFilter, demandMin, demandMax, competitionFilters, setFilters]);

  // Handle reset filters
  const handleResetFilters = useCallback(() => {
    setCategoryFilter("");
    setDemandMin(0);
    setDemandMax(100);
    setCompetitionFilters(["low", "medium", "high"]);
    setFilters({
      category: null,
      minDemand: 0,
      maxDemand: 100,
      competitionLevels: ["low", "medium", "high"],
    });
  }, [setFilters]);

  // Toggle competition level
  const toggleCompetitionLevel = useCallback((level: CompetitionLevel) => {
    setCompetitionFilters((prev) => {
      if (prev.includes(level)) {
        // Don't allow empty array
        if (prev.length === 1) return prev;
        return prev.filter((l) => l !== level);
      }
      return [...prev, level];
    });
  }, []);

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">{t("niche_analysis.title")}</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("niche_analysis.description")}
          </p>
        </div>
      </div>

      {/* Main content: Sidebar + Grid/Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Filter Sidebar */}
        <aside className="lg:col-span-1 space-y-4">
          <Card className="bg-card border border-border">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium text-foreground flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-[#faff69]" />
                {t("common.filter")}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Category Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t("niche_analysis.category")}
                </label>
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-muted border border-border rounded-md text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-[#faff69]"
                >
                  <option value="">{t("common.all")}</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Demand Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t("niche_analysis.demandRange")}
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={demandMin}
                      onChange={(e) => setDemandMin(Number(e.target.value))}
                      placeholder="0"
                      className="bg-muted border border-border text-foreground pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                      {t("niche_analysis.min")}
                    </span>
                  </div>
                  <span className="text-muted-foreground">—</span>
                  <div className="relative flex-1">
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={demandMax}
                      onChange={(e) => setDemandMax(Number(e.target.value))}
                      placeholder="100"
                      className="bg-muted border border-border text-foreground pr-8"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">
                      {t("niche_analysis.max")}
                    </span>
                  </div>
                </div>
              </div>

              {/* Competition Level */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">
                  {t("niche_analysis.competitionLevel")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {(["low", "medium", "high"] as CompetitionLevel[]).map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => toggleCompetitionLevel(level)}
                      className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                        competitionFilters.includes(level)
                          ? level === "low"
                            ? "bg-green-500/20 text-green-500 border border-green-500/50"
                            : level === "medium"
                            ? "bg-yellow-500/20 text-yellow-500 border border-yellow-500/50"
                            : "bg-red-500/20 text-red-500 border border-red-500/50"
                          : "bg-muted text-muted-foreground border border-border hover:border-border"
                      }`}
                    >
                      {t(`niche.competition${level.charAt(0).toUpperCase() + level.slice(1)}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Filter Actions */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="flex-1 border-border hover:bg-muted"
                >
                  {t("common.clear")}
                </Button>
                <Button
                  size="sm"
                  onClick={handleApplyFilters}
                  className="flex-1 bg-[#faff69] text-black hover:bg-[#f4f692]"
                >
                  {t("common.filter")}
                </Button>
              </div>
            </CardContent>
          </Card>
        </aside>

        {/* Data Grid + Charts */}
        <main className="lg:col-span-3 space-y-6">
          {/* Charts */}
          <NicheCharts data={nicheData} isLoading={isLoading} />

          {/* Data Grid */}
          <Card className="bg-card border border-border">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg font-medium text-foreground">
                {t("niche_analysis.dataTable")}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <NicheDataGrid data={nicheData} isLoading={isLoading} />
            </CardContent>
          </Card>
        </main>
      </div>
    </div>
  );
}
