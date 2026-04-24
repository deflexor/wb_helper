"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Pencil, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { PricingStrategy } from "@/hooks/usePricingStrategies";

interface StrategyCardProps {
  strategy: PricingStrategy;
  onEdit: (strategy: PricingStrategy) => void;
  onDelete: (id: string) => void;
  onToggleActive: (id: string, isActive: boolean) => void;
}

export function StrategyCard({
  strategy,
  onEdit,
  onDelete,
  onToggleActive,
}: StrategyCardProps) {
  const { t } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = useCallback(() => {
    if (isDeleting) {
      onDelete(strategy.id);
    } else {
      setIsDeleting(true);
      setTimeout(() => setIsDeleting(false), 2000);
    }
  }, [isDeleting, onDelete, strategy.id]);

  return (
    <Card
      className={cn(
        "bg-[#141414] border border-solid border-[rgba(65,65,65,0.8)] transition-opacity",
        strategy.isActive ? "border-l-4 border-l-[#faff69]" : "opacity-70"
      )}
      style={{ backgroundColor: "#141414" }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base text-white">{strategy.name}</CardTitle>
            <p className="text-xs text-gray-400">
              {new Date(strategy.createdAt).toLocaleDateString()}
            </p>
          </div>
          <Switch
            checked={strategy.isActive}
            onCheckedChange={(checked) => onToggleActive(strategy.id, checked)}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Strategy Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">{t("optimization.minMargin")}:</span>
            <span className="text-white">{strategy.minMargin}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">{t("optimization.maxPriceChange")}:</span>
            <span className="text-white">{strategy.maxPriceChange}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">{t("optimization.targetMargin")}:</span>
            <span className="text-white">{strategy.targetMargin}%</span>
          </div>
        </div>

        {/* Auto-apply indicator */}
        {strategy.autoApply && (
          <div className="inline-flex items-center px-2 py-1 rounded bg-[#faff69]/20 text-[#faff69] text-xs">
            {t("optimization.autoApply")}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onEdit(strategy)}
            className="flex-1 gap-1"
          >
            <Pencil className="h-3 w-3" />
            {t("common.edit")}
          </Button>
          <Button
            variant={isDeleting ? "destructive" : "outline"}
            size="sm"
            onClick={handleDelete}
            className="gap-1"
          >
            <Trash2 className="h-3 w-3" />
            {t("common.delete")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
