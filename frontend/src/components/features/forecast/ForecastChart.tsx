import { memo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
} from 'recharts';

export interface ForecastDataPoint {
  date: string;
  forecast: number;
  actual?: number;
  [key: string]: unknown;
}

export interface ForecastChartProps {
  data: ForecastDataPoint[];
  dataKey?: string;
  actualDataKey?: string;
  height?: number;
  showGrid?: boolean;
  showAnimation?: boolean;
}

const NEON_VOLT = '#faff69';
const NEON_PALE = '#f4f692';

/**
 * Custom tooltip with theme-aware styling using CSS variables
 */
type TooltipPayload = {
  name?: string;
  value?: unknown;
  color?: string;
  payload?: unknown;
};

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}) => {
  if (!active || !payload || payload.length === 0) {
    return null;
  }

  return (
    <div
      className="rounded-lg p-3 shadow-xl border"
      style={{
        backgroundColor: 'var(--chart-tooltip-bg, #ffffff)',
        borderColor: 'var(--chart-tooltip-border, #e5e5e5)',
      }}
    >
      <p className="text-sm mb-2" style={{ color: 'var(--chart-tooltip-text, #151515)' }}>
        {label}
      </p>
      {payload.map((entry: TooltipPayload, index: number) => (
        <p
          key={index}
          className="text-sm font-medium"
          style={{ color: entry.color || NEON_VOLT }}
        >
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toFixed(2) : String(entry.value)}
        </p>
      ))}
    </div>
  );
};

/**
 * Chart axes styling using CSS variables for theme awareness
 */
const axisStyle = {
  tick: { fill: 'var(--chart-text, #737373)' },
  axisLine: { stroke: 'var(--chart-grid, #e5e5e5)' },
  tickLine: { stroke: 'var(--chart-grid, #e5e5e5)' },
};

const gridStyle = {
  strokeDasharray: '3 3',
  stroke: 'var(--chart-grid, #e5e5e5)',
};

const ForecastChart = memo(function ForecastChart({
  data,
  dataKey = 'forecast',
  actualDataKey = 'actual',
  height = 300,
  showGrid = true,
  showAnimation = true,
}: ForecastChartProps) {
  return (
    <div className="w-full" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="forecastGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={NEON_VOLT} stopOpacity={0.3} />
              <stop offset="95%" stopColor={NEON_VOLT} stopOpacity={0} />
            </linearGradient>
            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={NEON_PALE} stopOpacity={0.3} />
              <stop offset="95%" stopColor={NEON_PALE} stopOpacity={0} />
            </linearGradient>
          </defs>

          {showGrid && <CartesianGrid {...gridStyle} />}

          <XAxis dataKey="date" {...axisStyle} />
          <YAxis {...axisStyle} />

          <Tooltip
            content={<CustomTooltip />}
            animationDuration={600}
            animationEasing="ease-out"
          />

          <Area
            type="monotone"
            dataKey={dataKey}
            stroke={NEON_VOLT}
            fill="url(#forecastGradient)"
            isAnimationActive={showAnimation}
            animationDuration={1000}
            animationEasing="ease-out"
          />

          {actualDataKey && (
            <Line
              type="monotone"
              dataKey={actualDataKey}
              stroke={NEON_PALE}
              strokeWidth={2}
              dot={false}
              isAnimationActive={showAnimation}
              animationDuration={1000}
              animationEasing="ease-out"
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
});

export { ForecastChart };