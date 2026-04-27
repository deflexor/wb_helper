"use client";

import { memo } from "react";
import { ShoppingBag, Store } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// =============================================================================
// TYPES
// =============================================================================

export type Marketplace = "wildberries" | "ozon";

export interface MarketplaceBadgeProps {
  marketplace: Marketplace;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

// =============================================================================
// CONFIG
// =============================================================================

const marketplaceConfig: Record<
  Marketplace,
  {
    label: string;
    fullName: string;
    icon: typeof ShoppingBag;
    bgColor: string;
    textColor: string;
    borderColor: string;
    iconColor: string;
  }
> = {
  wildberries: {
    label: "WB",
    fullName: "Wildberries",
    icon: ShoppingBag,
    bgColor: "bg-blue-950",
    textColor: "text-blue-400",
    borderColor: "border-blue-800",
    iconColor: "text-blue-400",
  },
  ozon: {
    label: "Ozon",
    fullName: "Ozon",
    icon: Store,
    bgColor: "bg-red-950",
    textColor: "text-red-400",
    borderColor: "border-red-800",
    iconColor: "text-red-400",
  },
};

// =============================================================================
// SIZE VARIANTS
// =============================================================================

const sizeConfig: Record<
  NonNullable<MarketplaceBadgeProps["size"]>,
  {
    badge: string;
    icon: string;
    text: string;
  }
> = {
  sm: {
    badge: "px-1.5 py-0.5 text-[10px]",
    icon: "h-3 w-3",
    text: "text-[10px]",
  },
  md: {
    badge: "px-2 py-1 text-xs",
    icon: "h-3.5 w-3.5",
    text: "text-xs",
  },
  lg: {
    badge: "px-2.5 py-1 text-sm",
    icon: "h-4 w-4",
    text: "text-sm",
  },
};

// =============================================================================
// COMPONENT
// =============================================================================

const MarketplaceBadge = memo(function MarketplaceBadge({
  marketplace,
  size = "md",
  showLabel = true,
  className,
}: MarketplaceBadgeProps) {
  const config = marketplaceConfig[marketplace];
  const sizeStyles = sizeConfig[size];
  const Icon = config.icon;

  const badgeContent = (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full font-medium border",
        config.bgColor,
        config.textColor,
        config.borderColor,
        sizeStyles.badge,
        className
      )}
    >
      <Icon className={cn(config.iconColor, sizeStyles.icon)} />
      {showLabel && <span className={sizeStyles.text}>{config.label}</span>}
    </span>
  );

  // Only show tooltip if showing label (otherwise it's redundant)
  if (showLabel) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>{badgeContent}</TooltipTrigger>
          <TooltipContent side="top" className="text-xs">
            <p>{config.fullName}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  return badgeContent;
});

export { MarketplaceBadge };
