"use client";

import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface PricingConfirmationProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  affectedProductCount: number;
  newMargin: number;
  currentMargin: number;
  estimatedProfitChange: number;
}

export function PricingConfirmation({
  open,
  onOpenChange,
  onConfirm,
  onCancel,
  affectedProductCount,
  newMargin,
  currentMargin,
  estimatedProfitChange,
}: PricingConfirmationProps) {
  const { t } = useTranslation();

  const marginChange = newMargin - currentMargin;
  const isPositiveChange = marginChange >= 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-muted border-border">
        <DialogHeader>
          <DialogTitle>{t("optimization.confirmApply")}</DialogTitle>
          <DialogDescription>
            {t("optimization.selectedProducts")}: {affectedProductCount}
          </DialogDescription>
        </DialogHeader>

        {/* Summary of Changes */}
        <div className="space-y-3 py-4">
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t("optimization.currentMargin")}:</span>
            <span className="text-sm font-medium text-foreground">{currentMargin.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t("optimization.newMargin")}:</span>
            <span
              className={`text-sm font-medium ${
                isPositiveChange ? "text-green-600 dark:text-green-400" : "text-destructive"
              }`}
            >
              {newMargin.toFixed(1)}%
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-muted-foreground">{t("optimization.potentialGain")}:</span>
            <span
              className={`text-sm font-medium ${
                estimatedProfitChange >= 0 ? "text-green-600 dark:text-green-400" : "text-destructive"
              }`}
            >
              {estimatedProfitChange >= 0 ? "+" : ""}
              {estimatedProfitChange.toFixed(2)} ₽
            </span>
          </div>
        </div>

        {/* Risk Warning */}
        <div className="p-3 rounded-md bg-black/40 text-sm text-muted-foreground">
          {t("optimization.riskLevel")}: {isPositiveChange ? t("competitors.lowRisk") : t("competitors.highRisk")}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={onCancel}>
            {t("common.cancel")}
          </Button>
          <Button onClick={onConfirm}>{t("common.confirm")}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
