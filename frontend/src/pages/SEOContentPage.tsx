"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { SEOContentCard } from "@/components/features/seo/SEOContentCard";
import { useSeoContent, type SEOContentInput } from "@/hooks/useSeoContent";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function SEOContentPage() {
  const { t } = useTranslation();
  const { content, isGenerating, error, generate, regenerate } = useSeoContent();

  // Form state for content input
  const [productName, setProductName] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [keywords, setKeywords] = useState("");

  // Handle copy to clipboard
  const handleCopy = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Silently fail - card handles feedback
    }
  }, []);

  // Handle save (mock - would save to backend in real app)
  const handleSave = useCallback(async (_text: string) => {
    // Mock save - in production would call API
    await new Promise((resolve) => setTimeout(resolve, 500));
  }, []);

  // Handle generate content
  const handleGenerate = useCallback(() => {
    const keywordList = keywords
      .split(",")
      .map((kw) => kw.trim())
      .filter(Boolean);

    const input: SEOContentInput = {
      originalContent: originalContent || productName,
      keywords: keywordList,
      contentType: "product",
      language: "en",
    };

    generate(input);
  }, [originalContent, productName, keywords, generate]);

  // Handle regenerate
  const handleRegenerate = useCallback(() => {
    regenerate();
  }, [regenerate]);

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            {t("seo_content.pageTitle")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("seo_content.pageDescription")}
          </p>
        </div>
      </div>

      {/* Input Form */}
      <Card className="bg-card border border-border">
        <CardContent className="p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="productName" className="text-sm font-medium text-foreground">
                {t("seo_content.fields.productName")}
              </label>
              <Input
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder={t("seo_content.fields.productName")}
                className="bg-muted border border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="keywords" className="text-sm font-medium text-foreground">
                {t("seo_content.fields.keywords")}
              </label>
              <Input
                id="keywords"
                value={keywords}
                onChange={(e) => setKeywords(e.target.value)}
                placeholder={t("seo_content.fields.keywords")}
                className="bg-muted border border-border text-foreground"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="description" className="text-sm font-medium text-foreground">
              {t("seo_content.fields.description")}
            </label>
            <textarea
              id="description"
              value={originalContent}
              onChange={(e) => setOriginalContent(e.target.value)}
              placeholder={t("seo_content.placeholder.original")}
              className="w-full h-32 px-4 py-2 bg-muted border border-border text-foreground rounded-lg resize-none focus:ring-2 focus:ring-[#faff69] focus:border-transparent"
            />
          </div>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || (!productName && !originalContent)}
            className="bg-[#faff69] text-black hover:bg-[#faff69]/90"
          >
            {isGenerating ? t("seo_content.loading") : t("seo_content.buttons.generate")}
          </Button>
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Card className="bg-red-900/20 border border-red-500/50">
          <CardContent className="p-4">
            <p className="text-red-400 text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* SEO Content Card with Split View */}
      <SEOContentCard
        originalContent={originalContent || productName}
        generatedContent={content?.content ?? null}
        isLoading={isGenerating}
        onCopy={handleCopy}
        onSave={handleSave}
        onRegenerate={handleRegenerate}
      />
    </div>
  );
}