"use client";

import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PricingPreviewProps {
  currentMargin: number;
  newMargin: number;
  estimatedProfitChange: number;
  minMargin: number;
  maxPriceChange: number;
  targetMargin: number;
}

export function PricingPreview({
  currentMargin,
  newMargin,
  estimatedProfitChange,
  minMargin,
  maxPriceChange,
  targetMargin,
}: PricingPreviewProps) {
  const { t } = useTranslation();

  const marginChange = useMemo(() => {
    return newMargin - currentMargin;
  }, [newMargin, currentMargin]);

  const isPositiveChange = useMemo(() => {
    return marginChange >= 0;
  }, [marginChange]);

  const isProfitPositive = useMemo(() => {
    return estimatedProfitChange >= 0;
  }, [estimatedProfitChange]);

  const previewItems = useMemo(
    () => [
      {
        label: t("optimization.currentMargin"),
        value: `${currentMargin.toFixed(1)}%`,
        isPositive: null,
      },
      {
        label: t("optimization.newMargin"),
        value: `${newMargin.toFixed(1)}%`,
        isPositive: isPositiveChange,
      },
      {
        label: t("optimization.potentialGain"),
        value: `${estimatedProfitChange >= 0 ? "+" : ""}${estimatedProfitChange.toFixed(2)} ₽`,
        isPositive: isProfitPositive,
      },
    ],
    [currentMargin, newMargin, estimatedProfitChange, isPositiveChange, isProfitPositive, t]
  );

  return (
    <Card className="bg-muted border-border">
      <CardHeader>
        <CardTitle>{t("optimization.preview")}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Settings Summary */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>{t("optimization.minMargin")}:</span>
            <span className="text-foreground">{minMargin}%</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t("optimization.maxPriceChange")}:</span>
            <span className="text-foreground">{maxPriceChange}%</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>{t("optimization.targetMargin")}:</span>
            <span className="text-foreground">{targetMargin}%</span>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t border-border" />

        {/* Live Calculations */}
        <div className="space-y-3">
          {previewItems.map((item, index) => (
            <div key={index} className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{item.label}</span>
              <span
                className={cn(
                  "text-sm font-medium",
                  item.isPositive === null
                    ? "text-foreground"
                    : item.isPositive
                    ? "text-green-600 dark:text-green-400"
                    : "text-destructive"
                )}
              >
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Visual Indicator for Margin Change */}
        <div className="mt-4 p-3 rounded-md bg-black/40">
          <div className="flex items-center gap-2">
            <div
              className={cn(
                "w-2 h-2 rounded-full",
                isPositiveChange ? "bg-green-600 dark:bg-green-400" : "bg-destructive"
              )}
            />
            <span className="text-sm text-muted-foreground">
              {isPositiveChange
                ? marginChange > 0
                  ? t("competitors.priceLower")
                  : t("competitors.priceSimilar")
                : t("competitors.priceHigher")}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
