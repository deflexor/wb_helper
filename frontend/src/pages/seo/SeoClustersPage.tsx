"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useMarketplace } from "@/components/MarketplaceProvider";
import { PremiumGate } from "@/components/features/premium-gate/PremiumGate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Layers, GitMerge, GitBranch, Download, Sparkles } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface KeywordCluster {
  id: number;
  name: string;
  keywords: string[];
  articleIds: string[];
  createdAt: string;
  keywordCount: number;
}

// =============================================================================
// MOCK DATA
// =============================================================================

const mockClusters: KeywordCluster[] = [
  {
    id: 1,
    name: "Headphones Core",
    keywords: ["наушники", "беспроводные наушники", "наушники bluetooth", "купить наушники"],
    articleIds: ["art-001", "art-002"],
    createdAt: "2026-04-20T10:00:00Z",
    keywordCount: 4,
  },
  {
    id: 2,
    name: "Gaming Audio",
    keywords: ["игровые наушники", "наушники для геймеров", "игровая гарнитура"],
    articleIds: ["art-003"],
    createdAt: "2026-04-21T10:00:00Z",
    keywordCount: 3,
  },
  {
    id: 3,
    name: "Budget Options",
    keywords: ["дешевые наушники", "бюджетные наушники", "недорогие наушники"],
    articleIds: ["art-001"],
    createdAt: "2026-04-22T10:00:00Z",
    keywordCount: 3,
  },
];

const availableKeywords = [
  "наушники",
  "беспроводные наушники",
  "наушники bluetooth",
  "купить наушники",
  "игровые наушники",
  "наушники для геймеров",
  "игровая гарнитура",
  "дешевые наушники",
  "бюджетные наушники",
  "недорогие наушники",
  "наушники Sony",
  "наушники JBL",
];

// =============================================================================
// SUB-COMPONENTS (< 50 lines each)
// =============================================================================

interface ClusterCardProps {
  cluster: KeywordCluster;
  onMerge: (clusterId: number) => void;
  onSplit: (clusterId: number) => void;
  onExport: (clusterId: number) => void;
}

function ClusterCard({ cluster, onMerge, onSplit, onExport }: ClusterCardProps) {
  const { t } = useTranslation();

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{cluster.name}</CardTitle>
          </div>
          <Badge variant="secondary">{cluster.keywordCount}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {/* Keywords Pills */}
        <div className="flex flex-wrap gap-2 mb-4">
          {cluster.keywords.map((kw, idx) => (
            <Badge key={idx} variant="outline" className="text-xs">
              {kw}
            </Badge>
          ))}
        </div>

        {/* Article IDs */}
        <div className="text-sm text-muted-foreground mb-4">
          <span className="font-medium">{t("seo.clusters.articles")}:</span>{" "}
          {cluster.articleIds.join(", ")}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMerge(cluster.id)}
            className="gap-1 flex-1"
          >
            <GitMerge className="h-4 w-4" />
            {t("seo.clusters.merge")}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSplit(cluster.id)}
            className="gap-1 flex-1"
          >
            <GitBranch className="h-4 w-4" />
            {t("seo.clusters.split")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onExport(cluster.id)}
            className="gap-1"
          >
            <Download className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function KeywordSelector({
  selectedKeywords,
  onToggle,
}: {
  selectedKeywords: string[];
  onToggle: (keyword: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 p-4 bg-muted/30 rounded-lg">
      {availableKeywords.map((kw) => {
        const isSelected = selectedKeywords.includes(kw);
        return (
          <Badge
            key={kw}
            variant={isSelected ? "default" : "outline"}
            className="cursor-pointer transition-colors"
            onClick={() => onToggle(kw)}
          >
            {kw}
          </Badge>
        );
      })}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export default function SeoClustersPage() {
  const { t } = useTranslation();
  useMarketplace(); // Initialize marketplace context

  const [clusters] = useState<KeywordCluster[]>(mockClusters);
  const [selectedKeywords, setSelectedKeywords] = useState<string[]>([]);
  const [newClusterName, setNewClusterName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Handlers
  const handleToggleKeyword = useCallback((keyword: string) => {
    setSelectedKeywords((prev) =>
      prev.includes(keyword)
        ? prev.filter((k) => k !== keyword)
        : [...prev, keyword]
    );
  }, []);

  const handleCreateCluster = useCallback(async () => {
    if (selectedKeywords.length < 2 || !newClusterName.trim()) return;

    setIsCreating(true);
    // Simulate AI clustering
    await new Promise((resolve) => setTimeout(resolve, 1500));
    alert(
      t("seo.clusters.createdMessage", {
        name: newClusterName,
        count: selectedKeywords.length,
      })
    );
    setNewClusterName("");
    setSelectedKeywords([]);
    setIsCreating(false);
  }, [selectedKeywords, newClusterName, t]);

  const handleMerge = useCallback((clusterId: number) => {
    alert(t("seo.clusters.mergeMessage", { id: clusterId }));
  }, [t]);

  const handleSplit = useCallback((clusterId: number) => {
    alert(t("seo.clusters.splitMessage", { id: clusterId }));
  }, [t]);

  const handleExport = useCallback((clusterId: number) => {
    const cluster = clusters.find((c) => c.id === clusterId);
    if (!cluster) return;

    const csv = [
      ["Cluster", "Keyword"],
      ...cluster.keywords.map((kw) => [cluster.name, kw]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${cluster.name.toLowerCase().replace(/\s+/g, "-")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [clusters, t]);

  return (
    <div className="container mx-auto py-8 px-4 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("seo.clusters.title")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("seo.clusters.description")}
          </p>
        </div>
      </div>

      {/* Create Cluster Form - Premium gated */}
      <PremiumGate feature="seo_content_generation" showOverlay>
        <Card>
          <CardHeader className="border-b border-border">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              <CardTitle className="text-base">{t("seo.clusters.createNew")}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="pt-4 space-y-4">
            <div className="flex gap-4">
              <Input
                placeholder={t("seo.clusters.clusterNamePlaceholder")}
                value={newClusterName}
                onChange={(e) => setNewClusterName(e.target.value)}
                className="flex-1"
              />
              <Button
                onClick={handleCreateCluster}
                disabled={selectedKeywords.length < 2 || !newClusterName.trim() || isCreating}
                className="gap-2 bg-[#faff69] text-[#151515] hover:bg-[#faff69]/90"
              >
                {isCreating ? (
                  <>
                    <Sparkles className="h-4 w-4 animate-pulse" />
                    {t("seo.clusters.aiClustering")}
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {t("seo.clusters.aiCluster")}
                  </>
                )}
              </Button>
            </div>

            {/* Keyword Selector */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-muted-foreground">
                {t("seo.clusters.selectKeywords")}
              </label>
              <KeywordSelector
                selectedKeywords={selectedKeywords}
                onToggle={handleToggleKeyword}
              />
              <p className="text-xs text-muted-foreground">
                {t("seo.clusters.selectedCount", { count: selectedKeywords.length })}
              </p>
            </div>
          </CardContent>
        </Card>
      </PremiumGate>

      {/* Existing Clusters */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("seo.clusters.yourClusters")}</h2>
          <span className="text-sm text-muted-foreground">
            {clusters.length} {t("seo.clusters.clusters")}
          </span>
        </div>

        {clusters.length === 0 ? (
          <Card className="py-12">
            <CardContent className="text-center text-muted-foreground">
              <Layers className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>{t("seo.clusters.noClusters")}</p>
              <p className="text-sm mt-2">
                {t("seo.clusters.createFirst")}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clusters.map((cluster) => (
              <ClusterCard
                key={cluster.id}
                cluster={cluster}
                onMerge={handleMerge}
                onSplit={handleSplit}
                onExport={handleExport}
              />
            ))}
          </div>
        )}
      </div>

      {/* Cluster Statistics */}
      <Card>
        <CardHeader className="border-b border-border">
          <CardTitle className="text-lg">{t("seo.clusters.statistics")}</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold">{clusters.length}</div>
              <p className="text-sm text-muted-foreground">
                {t("seo.clusters.totalClusters")}
              </p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold">
                {clusters.reduce((sum, c) => sum + c.keywordCount, 0)}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("seo.clusters.totalKeywords")}
              </p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold">
                {new Set(clusters.flatMap((c) => c.articleIds)).size}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("seo.clusters.targetedArticles")}
              </p>
            </div>
            <div className="text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-2xl font-bold">
                {clusters.length > 0
                  ? Math.round(
                      clusters.reduce((sum, c) => sum + c.keywordCount, 0) /
                        clusters.length
                    )
                  : 0}
              </div>
              <p className="text-sm text-muted-foreground">
                {t("seo.clusters.avgPerCluster")}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}