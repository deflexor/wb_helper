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

// Custom tooltip for scatter chart - dark theme styling
const ScatterTooltip = ({ active, payload }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload as NicheData;
  return (
    <div className="bg-[#0a0a0a] border border-[rgba(65,65,65,0.8)] rounded-lg px-3 py-2 shadow-lg">
      <p className="text-[#faff69] font-medium text-sm">{data.product}</p>
      <p className="text-gray-400 text-xs mt-1">
        {t('niche.demandScore')}: <span className="text-white">{data.demandScore}</span>
      </p>
      <p className="text-gray-400 text-xs">
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

// Custom tooltip for bar chart - dark theme styling
const BarTooltip = ({ active, payload, label }: TooltipProps<number, string>) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="bg-[#0a0a0a] border border-[rgba(65,65,65,0.8)] rounded-lg px-3 py-2 shadow-lg">
      <p className="text-white font-medium text-sm">{label}</p>
      <p className="text-[#faff69] text-xs mt-1">
        {t('niche.avgDemandScore')}: <span className="text-white font-medium">{payload[0].value}</span>
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
const GRID_COLOR = 'rgba(65, 65, 65, 0.3)';
const TEXT_COLOR = '#a0a0a0';

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
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis
                type="number"
                dataKey="x"
                name={t('niche.demandScore')}
                domain={[0, 100]}
                tick={{ fill: TEXT_COLOR, fontSize: 12 }}
                axisLine={{ stroke: GRID_COLOR }}
                tickLine={{ stroke: GRID_COLOR }}
                label={{
                  value: t('niche.demandScore'),
                  position: 'insideBottom',
                  offset: -10,
                  fill: TEXT_COLOR,
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
                tick={{ fill: TEXT_COLOR, fontSize: 10 }}
                axisLine={{ stroke: GRID_COLOR }}
                tickLine={{ stroke: GRID_COLOR }}
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
              <CartesianGrid strokeDasharray="3 3" stroke={GRID_COLOR} />
              <XAxis
                dataKey="category"
                tick={{ fill: TEXT_COLOR, fontSize: 11 }}
                axisLine={{ stroke: GRID_COLOR }}
                tickLine={{ stroke: GRID_COLOR }}
                angle={-20}
                textAnchor="end"
                height={60}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fill: TEXT_COLOR, fontSize: 12 }}
                axisLine={{ stroke: GRID_COLOR }}
                tickLine={{ stroke: GRID_COLOR }}
                label={{
                  value: t('niche.avgDemandScore'),
                  angle: -90,
                  position: 'insideLeft',
                  fill: TEXT_COLOR,
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