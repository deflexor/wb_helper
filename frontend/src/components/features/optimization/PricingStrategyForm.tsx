"use client";

import { useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PricingStrategyFormProps {
  onApply: (values: StrategyValues) => void;
  onChange?: (values: StrategyValues) => void;
  disabled?: boolean;
}

export interface StrategyValues {
  minMargin: number;
  maxPriceChange: number;
  targetMargin: number;
  autoApply: boolean;
}

interface ValidationErrors {
  targetMargin?: string;
}

const MIN_MARGIN_MAX = 50;
const MAX_PRICE_CHANGE_MAX = 20;

export function PricingStrategyForm({ onApply, onChange, disabled = false }: PricingStrategyFormProps) {
  const { t } = useTranslation();

  const [minMargin, setMinMargin] = useState<number>(10);
  const [maxPriceChange, setMaxPriceChange] = useState<number>(5);
  const [targetMargin, setTargetMargin] = useState<number>(20);
  const [autoApply, setAutoApply] = useState<boolean>(false);
  const [errors, setErrors] = useState<ValidationErrors>({});

  // Emit live changes for real-time preview updates
  const emitChange = useCallback(
    (values: StrategyValues) => {
      if (onChange) {
        onChange(values);
      }
    },
    [onChange]
  );

  const validateForm = useCallback((): boolean => {
    const newErrors: ValidationErrors = {};

    if (targetMargin < minMargin) {
      newErrors.targetMargin = t("optimization.targetMargin") + " must be >= " + t("optimization.minMargin");
    }

    if (targetMargin > 100) {
      newErrors.targetMargin = t("optimization.targetMargin") + " must be <= 100%";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [targetMargin, minMargin, t]);

  // Validate on every change
  const runValidation = useCallback(() => {
    const newErrors: ValidationErrors = {};

    if (targetMargin < minMargin) {
      newErrors.targetMargin = t("optimization.targetMargin") + " must be >= " + t("optimization.minMargin");
    }

    if (targetMargin > 100) {
      newErrors.targetMargin = t("optimization.targetMargin") + " must be <= 100%";
    }

    setErrors(newErrors);
  }, [targetMargin, minMargin, t]);

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();

      if (!validateForm()) {
        return;
      }

      onApply({
        minMargin,
        maxPriceChange,
        targetMargin,
        autoApply,
      });
    },
    [minMargin, maxPriceChange, targetMargin, autoApply, onApply, validateForm]
  );

  return (
    <Card
      className="bg-[#141414] border border-solid border-[rgba(65,65,65,0.8)]"
      style={{ backgroundColor: "#141414" }}
    >
      <CardHeader>
        <CardTitle>{t("optimization.optimizationSettings")}</CardTitle>
        <CardDescription>{t("optimization.strategy")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Minimum Margin Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-200">
                {t("optimization.minMargin")} ({minMargin}%)
              </label>
            </div>
            <Slider
              value={[minMargin]}
              onValueChange={(value) => {
                setMinMargin(value[0]);
                emitChange({ minMargin: value[0], maxPriceChange, targetMargin, autoApply });
                runValidation();
              }}
              max={MIN_MARGIN_MAX}
              step={1}
              disabled={disabled}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>0%</span>
              <span>{MIN_MARGIN_MAX}%</span>
            </div>
          </div>

          {/* Maximum Price Change Slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <label className="text-sm font-medium text-gray-200">
                {t("optimization.maxPriceChange")} ({maxPriceChange}%)
              </label>
            </div>
            <Slider
              value={[maxPriceChange]}
              onValueChange={(value) => {
                setMaxPriceChange(value[0]);
                emitChange({ minMargin, maxPriceChange: value[0], targetMargin, autoApply });
                runValidation();
              }}
              max={MAX_PRICE_CHANGE_MAX}
              step={1}
              disabled={disabled}
              className="py-2"
            />
            <div className="flex justify-between text-xs text-gray-400">
              <span>0%</span>
              <span>{MAX_PRICE_CHANGE_MAX}%</span>
            </div>
          </div>

          {/* Target Margin Input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-200">
              {t("optimization.targetMargin")} (%)
            </label>
            <Input
              type="number"
              value={targetMargin}
              onChange={(e) => {
                const value = Number(e.target.value);
                setTargetMargin(value);
                emitChange({ minMargin, maxPriceChange, targetMargin: value, autoApply });
                runValidation();
              }}
              min={0}
              max={100}
              disabled={disabled}
              className={cn(
                "bg-black/40 border-[rgba(65,65,65,0.8)] text-white",
                errors.targetMargin && "border-red-500"
              )}
            />
            {errors.targetMargin && (
              <p className="text-xs text-red-500">{errors.targetMargin}</p>
            )}
          </div>

          {/* Auto-apply Toggle */}
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium text-gray-200">
              {t("optimization.autoApply")}
            </label>
            <Switch
              checked={autoApply}
              onCheckedChange={(value) => {
                setAutoApply(value);
                emitChange({ minMargin, maxPriceChange, targetMargin, autoApply: value });
              }}
              disabled={disabled}
            />
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={disabled || Object.keys(errors).length > 0}
            className="w-full"
          >
            {t("optimization.apply")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
