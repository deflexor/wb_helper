"use client";

import { useState, useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";
import { PricingStrategyForm, type StrategyValues } from "@/components/features/optimization/PricingStrategyForm";
import { PricingPreview } from "@/components/features/optimization/PricingPreview";
import { PricingConfirmation } from "@/components/features/optimization/PricingConfirmation";
import { StrategyCard } from "@/components/features/optimization/StrategyCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { usePricingStrategies, type PricingStrategy } from "@/hooks/usePricingStrategies";

// Mock data for demo purposes - in real app this would come from backend
const MOCK_PRODUCTS = [
  { id: "1", name: "Товар 1", currentMargin: 15, price: 1000 },
  { id: "2", name: "Товар 2", currentMargin: 22, price: 2500 },
  { id: "3", name: "Товар 3", currentMargin: 8, price: 800 },
  { id: "4", name: "Товар 4", currentMargin: 30, price: 5000 },
  { id: "5", name: "Товар 5", currentMargin: 12, price: 1500 },
];

const AFFECTED_PRODUCT_COUNT = 5;

export default function OptimizationPage() {
  const { t } = useTranslation();

  const {
    strategies,
    createStrategy,
    deleteStrategy,
    setActiveStrategy,
    applyOptimisticUpdate,
    rollbackOptimisticUpdate,
  } = usePricingStrategies();

  // Local state for preview calculations
  const [previewValues, setPreviewValues] = useState<StrategyValues>({
    minMargin: 10,
    maxPriceChange: 5,
    targetMargin: 20,
    autoApply: false,
  });

  // Confirmation dialog state
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [pendingValues, setPendingValues] = useState<StrategyValues | null>(null);
  const [previousState, setPreviousState] = useState<PricingStrategy | null>(null);

  // Strategy edit/create dialog
  const [strategyDialogOpen, setStrategyDialogOpen] = useState(false);
  const [editingStrategy, setEditingStrategy] = useState<PricingStrategy | null>(null);
  const [strategyName, setStrategyName] = useState("");

  // Calculated preview values (mock calculations for demo)
  const currentMargin = useMemo(() => {
    return MOCK_PRODUCTS.reduce((sum, p) => sum + p.currentMargin, 0) / MOCK_PRODUCTS.length;
  }, []);

  const newMargin = useMemo(() => {
    return previewValues.targetMargin;
  }, [previewValues.targetMargin]);

  const estimatedProfitChange = useMemo(() => {
    // Mock calculation: based on target margin and affected products
    const avgPrice = MOCK_PRODUCTS.reduce((sum, p) => sum + p.price, 0) / MOCK_PRODUCTS.length;
    return (newMargin - currentMargin) * 0.01 * avgPrice * AFFECTED_PRODUCT_COUNT;
  }, [newMargin, currentMargin]);

  // Handle form apply - show confirmation
  const handleApply = useCallback((values: StrategyValues) => {
    setPendingValues(values);
    setConfirmationOpen(true);
  }, []);

  // Handle confirmation confirm - optimistic update
  const handleConfirm = useCallback(() => {
    if (!pendingValues) return;

    if (editingStrategy) {
      // Update existing strategy
      const updatedStrategy = {
        ...editingStrategy,
        ...pendingValues,
        name: strategyName || editingStrategy.name,
      };
      applyOptimisticUpdate(editingStrategy.id, updatedStrategy, editingStrategy);
    } else {
      // Create new strategy with optimistic update
      createStrategy({
        name: strategyName || `Strategy ${strategies.length + 1}`,
        ...pendingValues,
        isActive: false,
      });
    }

    setConfirmationOpen(false);
    setPendingValues(null);
    setStrategyDialogOpen(false);
    setEditingStrategy(null);
    setStrategyName("");
  }, [pendingValues, editingStrategy, strategyName, strategies.length, createStrategy, applyOptimisticUpdate]);

  // Handle confirmation cancel - rollback
  const handleCancel = useCallback(() => {
    if (previousState && editingStrategy) {
      rollbackOptimisticUpdate(editingStrategy.id, previousState);
    }
    setConfirmationOpen(false);
    setPendingValues(null);
    setPreviousState(null);
  }, [previousState, editingStrategy, rollbackOptimisticUpdate]);

  // Open edit dialog
  const handleEditStrategy = useCallback((strategy: PricingStrategy) => {
    setEditingStrategy(strategy);
    setStrategyName(strategy.name);
    setPreviewValues({
      minMargin: strategy.minMargin,
      maxPriceChange: strategy.maxPriceChange,
      targetMargin: strategy.targetMargin,
      autoApply: strategy.autoApply,
    });
    setStrategyDialogOpen(true);
  }, []);

  // Open create new strategy dialog
  const handleCreateStrategy = useCallback(() => {
    setEditingStrategy(null);
    setStrategyName("");
    setPreviewValues({
      minMargin: 10,
      maxPriceChange: 5,
      targetMargin: 20,
      autoApply: false,
    });
    setStrategyDialogOpen(true);
  }, []);

  // Update preview when sliders change
  const handlePreviewChange = useCallback((values: StrategyValues) => {
    setPreviewValues(values);
  }, []);

  return (
    <div className="container mx-auto py-8 px-4 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">{t("optimization.title")}</h1>
          <p className="text-sm text-gray-400 mt-1">
            {t("optimization.selectedProducts")}: {AFFECTED_PRODUCT_COUNT}
          </p>
        </div>
        <Button onClick={handleCreateStrategy} className="gap-2">
          <Plus className="h-4 w-4" />
          {t("competitors.addCompetitor")}
        </Button>
      </div>

      {/* Form + Preview side by side */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PricingStrategyForm onApply={handleApply} onChange={handlePreviewChange} />
        <PricingPreview
          currentMargin={currentMargin}
          newMargin={newMargin}
          estimatedProfitChange={estimatedProfitChange}
          minMargin={previewValues.minMargin}
          maxPriceChange={previewValues.maxPriceChange}
          targetMargin={previewValues.targetMargin}
        />
      </div>

      {/* Saved Strategies */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-white">{t("optimization.strategy")}s</h2>
        {strategies.length === 0 ? (
          <Card className="bg-[#141414] border border-solid border-[rgba(65,65,65,0.8)]">
            <CardContent className="py-8">
              <p className="text-center text-gray-400">{t("optimization.noProductsSelected")}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {strategies.map((strategy) => (
              <StrategyCard
                key={strategy.id}
                strategy={strategy}
                onEdit={handleEditStrategy}
                onDelete={deleteStrategy}
                onToggleActive={setActiveStrategy}
              />
            ))}
          </div>
        )}
      </div>

      {/* Confirmation Dialog */}
      <PricingConfirmation
        open={confirmationOpen}
        onOpenChange={setConfirmationOpen}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
        affectedProductCount={AFFECTED_PRODUCT_COUNT}
        newMargin={newMargin}
        currentMargin={currentMargin}
        estimatedProfitChange={estimatedProfitChange}
      />

      {/* Strategy Edit/Create Dialog */}
      <Dialog open={strategyDialogOpen} onOpenChange={setStrategyDialogOpen}>
        <DialogContent className="bg-[#141414] border border-solid border-[rgba(65,65,65,0.8)]">
          <DialogHeader>
            <DialogTitle>
              {editingStrategy ? t("common.edit") : t("common.save")}
            </DialogTitle>
            <DialogDescription>
              {editingStrategy
                ? t("optimization.strategy")
                : t("optimization.optimizationSettings")}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-200">
                {t("competitors.productName")}
              </label>
              <Input
                value={strategyName}
                onChange={(e) => setStrategyName(e.target.value)}
                placeholder={t("optimization.strategy")}
                className="bg-black/40 border-[rgba(65,65,65,0.8)] text-white"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setStrategyDialogOpen(false)}>
              {t("common.cancel")}
            </Button>
            <Button onClick={handleConfirm}>
              {editingStrategy ? t("common.save") : t("common.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
