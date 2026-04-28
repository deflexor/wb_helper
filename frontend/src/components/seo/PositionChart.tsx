"use client";

import { memo } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

// =============================================================================
// TYPES
// =============================================================================

export interface PositionDataPoint {
  date: string;
  position: number;
  [key: string]: unknown;
}

export interface PositionChartProps {
  data: PositionDataPoint[];
  isLoading?: boolean;
  height?: number;
  showGrid?: boolean;
  showAnimation?: boolean;
  title?: string;
  className?: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const POSITIVE_COLOR = "var(--primary)";
const NEUTRAL_COLOR = "var(--chart-neutral, #ca8a04)";
const NEGATIVE_COLOR = "var(--destructive)";
const TEXT_COLOR = "var(--chart-text, #737373)";
const GRID_COLOR = "var(--chart-grid, #e5e5e5)";

// =============================================================================
// CUSTOM TOOLTIP
// =============================================================================

interface CustomTooltipPayload {
  name?: string;
  value?: number;
  color?: string;
  payload?: PositionDataPoint;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  const data = payload[0];
  const position = data.value;

  if (position === undefined) {
    return null;
  }

  // Color based on position (lower is better)
  let positionColor = NEUTRAL_COLOR;
  if (position <= 3) {
    positionColor = POSITIVE_COLOR;
  } else if (position > 10) {
    positionColor = NEGATIVE_COLOR;
  }

  return (
    <div
      className="rounded-lg p-3 shadow-xl border"
      style={{
        backgroundColor: "var(--chart-tooltip-bg, #ffffff)",
        borderColor: "var(--chart-tooltip-border, #e5e5e5)",
      }}
    >
      <p className="text-sm font-medium mb-1" style={{ color: TEXT_COLOR }}>
        {label}
      </p>
      <div className="flex items-center gap-2">
        <span
          className="text-lg font-bold"
          style={{ color: positionColor }}
        >
          #{position}
        </span>
        <span className="text-xs text-muted-foreground">position</span>
      </div>
    </div>
  );
}

// =============================================================================
// AXIS STYLE
// =============================================================================

const axisStyle = {
  tick: { fill: TEXT_COLOR, fontSize: 12 },
  axisLine: { stroke: GRID_COLOR },
  tickLine: { stroke: GRID_COLOR },
};

const gridStyle = {
  strokeDasharray: "3 3",
  stroke: GRID_COLOR,
};

// =============================================================================
// SKELETON
// =============================================================================

function ChartSkeleton({ height }: { height: number }) {
  return (
    <div className="w-full flex flex-col gap-4" style={{ height }}>
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-20" />
      </div>
      <Skeleton className="flex-1" />
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

const PositionChart = memo(function PositionChart({
  data,
  isLoading = false,
  height = 300,
  showGrid = true,
  showAnimation = true,
  title = "Position Over Time",
  className,
}: PositionChartProps) {
  // Calculate domain for Y-axis (inverted - lower position is better)
  const positions = data.map((d) => d.position);
  const minPosition = Math.max(1, Math.min(...positions) - 2);
  const maxPosition = Math.max(...positions) + 2;

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
    });
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3 border-b border-border">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          {data.length > 0 && (
            <span className="text-sm text-muted-foreground">
              {data.length} data point{data.length !== 1 ? "s" : ""}
            </span>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-4">
        {isLoading ? (
          <ChartSkeleton height={height} />
        ) : data.length === 0 ? (
          <div
            className="flex items-center justify-center text-muted-foreground"
            style={{ height }}
          >
            No position data available
          </div>
        ) : (
          <div className="w-full" style={{ height }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={data}
                margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
              >
                {showGrid && <CartesianGrid {...gridStyle} />}

                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  {...axisStyle}
                />

                {/* Inverted Y-axis: lower position number at top */}
                <YAxis
                  domain={[minPosition, maxPosition]}
                  reversed
                  tickFormatter={(value) => `#${value}`}
                  {...axisStyle}
                />

                <Tooltip content={<CustomTooltip />} />

                <Line
                  type="monotone"
                  dataKey="position"
                  stroke={NEUTRAL_COLOR}
                  strokeWidth={2}
                  dot={{ fill: NEUTRAL_COLOR, strokeWidth: 0, r: 3 }}
                  activeDot={{
                    fill: NEUTRAL_COLOR,
                    strokeWidth: 2,
                    stroke: "#fff",
                    r: 6,
                  }}
                  isAnimationActive={showAnimation}
                  animationDuration={800}
                  animationEasing="ease-out"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Legend */}
        {!isLoading && data.length > 0 && (
          <div className="flex items-center justify-center gap-6 mt-4 pt-4 border-t border-border">
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: POSITIVE_COLOR }}
              />
              <span className="text-xs text-muted-foreground">
                Top 3 (Excellent)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: NEUTRAL_COLOR }}
              />
              <span className="text-xs text-muted-foreground">
                4-10 (Good)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: NEGATIVE_COLOR }}
              />
              <span className="text-xs text-muted-foreground">
                10+ (Needs work)
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
});

export { PositionChart };
