import { memo, useMemo } from 'react';
import {
  ScatterChart,
  Scatter,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  type TooltipProps,
} from 'recharts';
import { t } from '@/i18n';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface NicheData {
  id: string;
  product: string;
  category: string;
  demandScore: number;
  competitionLevel: 'low' | 'medium' | 'high';
  trend: 'up' | 'down' | 'stable';
}

interface NicheChartsProps {
  data: NicheData[];
  isLoading?: boolean;
}

// Custom tooltip for scatter chart - theme-aware styling
const ScatterTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload as NicheData;
  return (
    <div
      className="rounded-lg px-3 py-2 shadow-lg border"
      style={{
        backgroundColor: 'var(--chart-tooltip-bg, #ffffff)',
        borderColor: 'var(--chart-tooltip-border, #e5e5e5)',
      }}
    >
      <p className="font-medium text-sm" style={{ color: NEON_VOLT }}>{data.product}</p>
      <p className="text-xs mt-1" style={{ color: 'var(--chart-tooltip-text, #151515)' }}>
        {t('niche.demandScore')}: <span style={{ color: 'var(--chart-tooltip-text, #151515)' }}>{data.demandScore}</span>
      </p>
      <p className="text-xs" style={{ color: 'var(--chart-tooltip-text, #151515)' }}>
        {t('niche.competitionLevel')}:{' '}
        <span
          className={cn(
            data.competitionLevel === 'low' && 'text-green-500',
            data.competitionLevel === 'medium' && 'text-yellow-500',
            data.competitionLevel === 'high' && 'text-red-500'
          )}
        >
          {t(`niche.competition${data.competitionLevel.charAt(0).toUpperCase() + data.competitionLevel.slice(1)}`)}
        </span>
      </p>
    </div>
  );
};

// Custom tooltip for bar chart - theme-aware styling
const BarTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;

  return (
    <div
      className="rounded-lg px-3 py-2 shadow-lg border"
      style={{
        backgroundColor: 'var(--chart-tooltip-bg, #ffffff)',
        borderColor: 'var(--chart-tooltip-border, #e5e5e5)',
      }}
    >
      <p className="font-medium text-sm" style={{ color: 'var(--chart-tooltip-text, #151515)' }}>{label}</p>
      <p className="text-xs mt-1" style={{ color: NEON_VOLT }}>
        {t('niche.avgDemandScore')}: <span className="font-medium" style={{ color: 'var(--chart-tooltip-text, #151515)' }}>{payload[0].value}</span>
      </p>
    </div>
  );
};

// Competition level to numeric value mapping
const competitionToNumber = (level: 'low' | 'medium' | 'high'): number => {
  const map = { low: 1, medium: 2, high: 3 };
  return map[level];
};

// Chart colors
const NEON_VOLT = '#faff69';

export const NicheCharts = memo(function NicheCharts({ data, isLoading }: NicheChartsProps) {
  // Transform data for scatter chart: demand score (x) vs competition (y)
  const scatterData = useMemo(() => {
    return data.map((item) => ({
      ...item,
      x: item.demandScore,
      y: competitionToNumber(item.competitionLevel),
    }));
  }, [data]);

  // Transform data for bar chart: average demand score per category
  const barData = useMemo(() => {
    const categoryMap = new Map<string, number[]>();

    data.forEach((item) => {
      const existing = categoryMap.get(item.category) || [];
      existing.push(item.demandScore);
      categoryMap.set(item.category, existing);
    });

    return Array.from(categoryMap.entries()).map(([category, scores]) => ({
      category,
      avgDemand: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      count: scores.length,
    }));
  }, [data]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-card border-[rgba(65,65,65,0.8)]">
          <CardHeader>
            <div className="h-6 w-32 bg-[#1a1a1a] rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-[300px] bg-[#0a0a0a] rounded animate-pulse" />
          </CardContent>
        </Card>
        <Card className="bg-card border-[rgba(65,65,65,0.8)]">
          <CardHeader>
            <div className="h-6 w-32 bg-[#1a1a1a] rounded animate-pulse" />
          </CardHeader>
          <CardContent>
            <div className="h-[300px] bg-[#0a0a0a] rounded animate-pulse" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {/* Scatter Chart: Demand vs Competition */}
      <Card className="bg-card border-[rgba(65,65,65,0.8)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-foreground">
            {t('niche.demandVsCompetition')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={300}>
            <ScatterChart
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e5e5e5)" />
              <XAxis
                type="number"
                dataKey="x"
                name={t('niche.demandScore')}
                domain={[0, 100]}
                tick={{ fill: 'var(--chart-text, #737373)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--chart-grid, #e5e5e5)' }}
                tickLine={{ stroke: 'var(--chart-grid, #e5e5e5)' }}
                label={{
                  value: t('niche.demandScore'),
                  position: 'insideBottom',
                  offset: -10,
                  fill: 'var(--chart-text, #737373)',
                  fontSize: 12,
                }}
              />
              <YAxis
                type="number"
                dataKey="y"
                name={t('niche.competitionLevel')}
                domain={[0, 4]}
                ticks={[1, 2, 3]}
                tickFormatter={(value) => {
                  const labels = { 1: t('niche.competitionLow'), 2: t('niche.competitionMedium'), 3: t('niche.competitionHigh') };
                  return labels[value as keyof typeof labels] || '';
                }}
                tick={{ fill: 'var(--chart-text, #737373)', fontSize: 10 }}
                axisLine={{ stroke: 'var(--chart-grid, #e5e5e5)' }}
                tickLine={{ stroke: 'var(--chart-grid, #e5e5e5)' }}
                width={80}
              />
              <Tooltip content={<ScatterTooltip />} />
              <Legend
                verticalAlign="top"
                height={36}
                iconType="circle"
                formatter={(value) => <span className="text-gray-400 text-xs">{value}</span>}
              />
              <Scatter
                name={t('niche.products')}
                data={scatterData}
                fill={NEON_VOLT}
                isAnimationActive
                animationDuration={800}
                animationEasing="ease-out"
              >
                {scatterData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.competitionLevel === 'low'
                        ? '#22c55e'
                        : entry.competitionLevel === 'medium'
                          ? '#eab308'
                          : '#ef4444'
                    }
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Bar Chart: Average Demand by Category */}
      <Card className="bg-card border-[rgba(65,65,65,0.8)]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base font-medium text-foreground">
            {t('niche.avgDemandByCategory')}
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={barData}
              margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="var(--chart-grid, #e5e5e5)" />
              <XAxis
                dataKey="category"
                tick={{ fill: 'var(--chart-text, #737373)', fontSize: 11 }}
                axisLine={{ stroke: 'var(--chart-grid, #e5e5e5)' }}
                tickLine={{ stroke: 'var(--chart-grid, #e5e5e5)' }}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: 'var(--chart-text, #737373)', fontSize: 12 }}
                axisLine={{ stroke: 'var(--chart-grid, #e5e5e5)' }}
                tickLine={{ stroke: 'var(--chart-grid, #e5e5e5)' }}
                label={{
                  value: t('niche.avgDemandScore'),
                  angle: -90,
                  position: 'insideLeft',
                  fill: 'var(--chart-text, #737373)',
                  fontSize: 12,
                }}
              />
              <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(250, 255, 105, 0.1)' }} />
              <Bar
                dataKey="avgDemand"
                name={t('niche.avgDemandScore')}
                fill={NEON_VOLT}
                radius={[4, 4, 0, 0]}
                isAnimationActive
                animationDuration={800}
                animationEasing="ease-out"
              />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </div>
  );
});