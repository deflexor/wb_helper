import { useState, useCallback, useMemo } from 'react';

// Types
export type RiskLevel = 'low' | 'medium' | 'high';

export interface ReturnsDataPoint {
  date: string;
  returns: number;
  predictedReturns?: number;
  confidence: number;
  riskLevel: RiskLevel;
}

export interface ForecastFilters {
  dateRange: '7d' | '14d' | '30d' | '90d';
  riskLevel: RiskLevel | 'all';
  category: string;
}

interface UseReturnsForecastReturn {
  forecast: ReturnsDataPoint[];
  isLoading: boolean;
  filters: ForecastFilters;
  setFilters: (filters: Partial<ForecastFilters>) => void;
}

// Pure functions for data transformation
export const calculateAverageReturns = (data: ReturnsDataPoint[]): number => {
  if (data.length === 0) return 0;
  return data.reduce((sum, point) => sum + point.returns, 0) / data.length;
};

export const filterByRiskLevel = (
  data: ReturnsDataPoint[],
  riskLevel: RiskLevel | 'all'
): ReturnsDataPoint[] => {
  if (riskLevel === 'all') return data;
  return data.filter((point) => point.riskLevel === riskLevel);
};

export const filterByDateRange = (
  data: ReturnsDataPoint[],
  days: number
): ReturnsDataPoint[] => {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  const cutoffStr = cutoffDate.toISOString().split('T')[0];
  return data.filter((point) => point.date >= cutoffStr);
};

export const applyFilters = (
  data: ReturnsDataPoint[],
  filters: ForecastFilters
): ReturnsDataPoint[] => {
  let result = data;
  result = filterByRiskLevel(result, filters.riskLevel);
  const days = { '7d': 7, '14d': 14, '30d': 30, '90d': 90 }[filters.dateRange];
  result = filterByDateRange(result, days);
  return result;
};

// Mock data generator - creates realistic time series for chart visualization
const generateMockForecast = (): ReturnsDataPoint[] => {
  const data: ReturnsDataPoint[] = [];
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - 45); // Start 45 days ago for 30+ day range

  for (let i = 0; i < 45; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    const dateStr = date.toISOString().split('T')[0];

    // Generate realistic returns pattern with seasonality and trend
    const baseReturns = 5 + Math.sin(i * 0.3) * 2;
    const trend = i * 0.05; // Slight upward trend
    const noise = (Math.random() - 0.5) * 3;
    const returns = Math.round((baseReturns + trend + noise) * 100) / 100;

    // Predicted values follow similar pattern with less noise
    const predictedReturns = Math.round((baseReturns + trend + 0.5) * 100) / 100;

    // Confidence decreases further into future
    const daysFromToday = i - 15;
    const confidence = daysFromToday < 0
      ? 1.0
      : Math.max(0.6, 1 - (daysFromToday * 0.02));

    // Risk level based on returns volatility
    const volatility = Math.abs(returns - baseReturns);
    const riskLevel: RiskLevel =
      volatility > 2.5 ? 'high' : volatility > 1.5 ? 'medium' : 'low';

    data.push({
      date: dateStr,
      returns,
      predictedReturns: daysFromToday >= 0 ? predictedReturns : undefined,
      confidence,
      riskLevel,
    });
  }

  return data;
};

const MOCK_FORECAST_DATA = generateMockForecast();

// Hook
export const useReturnsForecast = (): UseReturnsForecastReturn => {
  const [filters, setFiltersState] = useState<ForecastFilters>({
    dateRange: '30d',
    riskLevel: 'all',
    category: 'all',
  });

  const [isLoading] = useState(false);

  const forecast = useMemo(
    () => applyFilters(MOCK_FORECAST_DATA, filters),
    [filters]
  );

  const setFilters = useCallback((newFilters: Partial<ForecastFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...newFilters }));
  }, []);

  return {
    forecast,
    isLoading,
    filters,
    setFilters,
  };
};
