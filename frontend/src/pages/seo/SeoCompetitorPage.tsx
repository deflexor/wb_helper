"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useMarketplace } from "@/components/MarketplaceProvider";
import { PremiumGate } from "@/components/features/premium-gate/PremiumGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Search, TrendingUp, TrendingDown, Target } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface CompetitorKeyword {
  keyword: string;
  competitorPosition: number;
  yourPosition: number | null;
  difference: number;
}

interface CompetitorAnalysis {
  competitorArticleId: string;
  keywords: CompetitorKeyword[];
  totalKeywords: number;
  averagePosition: number;
  overlapCount: number;
  gapCount: number;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const mockCompetitorKeywords: CompetitorKeyword[] = [
  { keyword: "наушники беспроводные", competitorPosition: 3, yourPosition: 12, difference: -9 },
  { keyword: "наушники Sony", competitorPosition: 5, yourPosition: null, difference: -999 },
  { keyword: "игровые наушники", competitorPosition: 8, yourPosition: 15, difference: -7 },
  { keyword: "наушники JBL", competitorPosition: 2, yourPosition: null, difference: -999 },
  { keyword: "купить наушники", competitorPosition: 10, yourPosition: 8, difference: 2 },
  { keyword: "наушники для музыки", competitorPosition: 14, yourPosition: 25, difference: -11 },
  { keyword: "профессиональные наушники", competitorPosition: 6, yourPosition: null, difference: -999 },
  { keyword: "наушники с шумоподавлением", competitorPosition: 4, yourPosition: 18, difference: -14 },
];

// =============================================================================
// SUB-COMPONENTS (< 50 lines each)
// =============================================================================

interface KeywordComparisonRowProps {
  item: CompetitorKeyword;
}

function KeywordComparisonRow({ item }: KeywordComparisonRowProps) {
  const { t } = useTranslation();

  const isWinning = item.yourPosition !== null && item.difference > 0;

  return (
    <tr className="border-b border-border hover:bg-muted/30 transition-colors">
      <td className="py-3 px-4 font-medium">{item.keyword}</td>
      <td className="py-3 px-4 text-center">
        <Badge variant="outline" className="bg-blue-500/10 text-blue-500 border-blue-500/30">
          #{item.competitorPosition}
        </Badge>
      </td>
      <td className="py-3 px-4 text-center">
        {item.yourPosition !== null ? (
          <Badge
            variant={isWinning ? "default" : "secondary"}
            className={`${
              isWinning ? "bg-green-500/20 text-green-500" : ""
            }`}
          >
            #{item.yourPosition}
          </Badge>
        ) : (
          <span className="text-muted-foreground text-sm">
            {t("seo.competitor.notRanking")}
          </span>
        )}
      </td>
      <td className="py-3 px-4 text-center">
        {item.yourPosition !== null ? (
          <div className={`flex items-center justify-center gap-1 ${isWinning ? "text-green-500" : "text-red-500"}`}>
            {isWinning ? (
              <TrendingUp className="h-4 w-4" />
            ) : (
              <TrendingDown className="h-4 w-4" />
            )}
            <span className="font-medium">
              {isWinning ? `+${Math.abs(item.difference)}` : item.difference}
            </span>
          </div>
        ) : (
          <Badge variant="destructive" className="bg-red-500/20">
            {t("seo.competitor.gap")}
          </Badge>
        )}
      </td>
    </tr>
  );
}

function GapCard({ keyword }: { keyword: string }) {
  const { t } = useTranslation();

  return (
    <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
      <span className="font-medium">{keyword}</span>
      <Button size="sm" variant="outline" className="gap-1">
        <Target className="h-4 w-4" />
        {t("seo.competitor.addToTarget")}
      </Button>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SeoCompetitorPage() {
  const { t } = useTranslation();
  useMarketplace(); // Initialize marketplace context

  // State
  const [competitorArticleId, setCompetitorArticleId] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<CompetitorAnalysis | null>(null);
  const [showGaps, setShowGaps] = useState(false);

  // Filter gaps
  const gapKeywords = useMemo(
    () => analysis?.keywords.filter((kw) => kw.yourPosition === null) ?? [],
    [analysis]
  );

  // Win/Loss stats
  const stats = useMemo(() => {
    if (!analysis) return { wins: 0, losses: 0, gaps: 0 };
    const ranked = analysis.keywords.filter((kw) => kw.yourPosition !== null);
    const wins = ranked.filter((kw) => kw.difference > 0).length;
    const losses = ranked.filter((kw) => kw.difference < 0).length;
    const gaps = analysis.keywords.filter((kw) => kw.yourPosition === null).length;
    return { wins, losses, gaps };
  }, [analysis]);

  // Handlers
  const handleAnalyze = useCallback(async () => {
    if (!competitorArticleId.trim()) return;

    setIsAnalyzing(true);
    setShowGaps(false);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));

    setAnalysis({
      competitorArticleId: competitorArticleId.trim(),
      keywords: mockCompetitorKeywords,
      totalKeywords: mockCompetitorKeywords.length,
      averagePosition:
        mockCompetitorKeywords.reduce((sum, kw) => sum + kw.competitorPosition, 0) /
        mockCompetitorKeywords.length,
      overlapCount: mockCompetitorKeywords.filter((kw) => kw.yourPosition !== null).length,
      gapCount: mockCompetitorKeywords.filter((kw) => kw.yourPosition === null).length,
    });

    setIsAnalyzing(false);
  }, [competitorArticleId]);

  const handleFindGaps = useCallback(() => {
    setShowGaps(true);
  }, []);

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("seo.competitor.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("seo.competitor.description")}
          </p>
        </div>
      </div>

      {/* Analysis Form */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-lg">{t("seo.competitor.analyzeCompetitor")}</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="flex gap-4">
            <Input
              placeholder={t("seo.competitor.articleIdPlaceholder")}
              value={competitorArticleId}
              onChange={(e) => setCompetitorArticleId(e.target.value)}
              className="flex-1"
            />
            <Button
              onClick={handleAnalyze}
              disabled={!competitorArticleId.trim() || isAnalyzing}
              className="gap-2 bg-[#faff69] text-[#151515] hover:bg-[#faff69]/90"
            >
              {isAnalyzing ? (
                <>
                  <Search className="h-4 w-4 animate-pulse" />
                  {t("seo.competitor.analyzing")}
                </>
              ) : (
                <>
                  <Search className="h-4 w-4" />
                  {t("seo.competitor.analyze")}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Results - Premium gated */}
      <PremiumGate feature="competitor_analysis_full" showOverlay>
        {analysis ? (
          <>
            {/* Stats Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold">{analysis.totalKeywords}</div>
                  <p className="text-sm text-muted-foreground">
                    {t("seo.competitor.totalKeywords")}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-green-500/10 border-green-500/30">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-green-500">{stats.wins}</div>
                  <p className="text-sm text-muted-foreground">
                    {t("seo.competitor.winning")}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-red-500/10 border-red-500/30">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-red-500">{stats.losses}</div>
                  <p className="text-sm text-muted-foreground">
                    {t("seo.competitor.losing")}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-amber-500/10 border-amber-500/30">
                <CardContent className="pt-6">
                  <div className="text-2xl font-bold text-amber-500">{stats.gaps}</div>
                  <p className="text-sm text-muted-foreground">
                    {t("seo.competitor.gaps")}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Keywords Comparison Table */}
            <Card>
              <CardHeader className="border-b border-border">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">
                    {t("seo.competitor.positionComparison")}
                  </CardTitle>
                  {gapKeywords.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFindGaps}
                      className="gap-1"
                    >
                      <Target className="h-4 w-4" />
                      {t("seo.competitor.findGaps")} ({gapKeywords.length})
                    </Button>
                  )}
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
                        <th className="py-3 px-4 text-center text-sm font-medium text-muted-foreground">
                          {t("seo.competitor.competitorPosition")}
                        </th>
                        <th className="py-3 px-4 text-center text-sm font-medium text-muted-foreground">
                          {t("seo.competitor.yourPosition")}
                        </th>
                        <th className="py-3 px-4 text-center text-sm font-medium text-muted-foreground">
                          {t("seo.table.change")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis.keywords.map((item, idx) => (
                        <KeywordComparisonRow key={idx} item={item} />
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Gap Keywords Section */}
            {showGaps && gapKeywords.length > 0 && (
              <Card className="border-amber-500/30 bg-amber-500/5">
                <CardHeader className="border-b border-amber-500/30">
                  <div className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-amber-500" />
                    <CardTitle className="text-base">
                      {t("seo.competitor.opportunityKeywords")}
                    </CardTitle>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t("seo.competitor.gapDescription")}
                  </p>
                </CardHeader>
                <CardContent className="pt-4 space-y-2">
                  {gapKeywords.map((kw, idx) => (
                    <GapCard key={idx} keyword={kw.keyword} />
                  ))}
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <Card className="py-12">
            <CardContent className="text-center text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("seo.competitor.enterArticleId")}</p>
            </CardContent>
          </Card>
        )}
      </PremiumGate>
    </div>
  );
}