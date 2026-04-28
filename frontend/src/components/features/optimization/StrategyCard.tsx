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
        "bg-card border-border transition-opacity",
        strategy.isActive ? "border-l-4 border-l-primary" : "opacity-70"
      )}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-base text-foreground">{strategy.name}</CardTitle>
            <p className="text-xs text-muted-foreground">
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
            <span className="text-muted-foreground">{t("optimization.minMargin")}:</span>
            <span className="text-foreground">{strategy.minMargin}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("optimization.maxPriceChange")}:</span>
            <span className="text-foreground">{strategy.maxPriceChange}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">{t("optimization.targetMargin")}:</span>
            <span className="text-foreground">{strategy.targetMargin}%</span>
          </div>
        </div>

        {/* Auto-apply indicator */}
        {strategy.autoApply && (
          <div className="inline-flex items-center px-2 py-1 rounded bg-primary/20 text-primary text-xs">
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
