import { useState, useCallback, useMemo } from 'react';

// =============================================================================
// Types
// =============================================================================

export type CompetitionLevel = 'low' | 'medium' | 'high';
export type TrendDirection = 'up' | 'down' | 'stable';

export interface NicheDataPoint {
  id: string;
  productName: string;
  category: string;
  demandScore: number; // 0-100
  competitionLevel: CompetitionLevel;
  trendDirection: TrendDirection;
  avgPrice: number;
  topCompetitorPrice: number;
  marketShare: number; // percentage
  updatedAt: string;
}

export interface NicheFilters {
  category: string | null;
  minDemand: number;
  maxDemand: number;
  competitionLevels: CompetitionLevel[];
  trendDirections: TrendDirection[];
}

export type SortField = 'productName' | 'demandScore' | 'competitionLevel' | 'trendDirection';
export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  field: SortField;
  direction: SortDirection;
}

interface UseNicheAnalysisReturn {
  data: NicheDataPoint[];
  isLoading: boolean;
  filters: NicheFilters;
  setFilters: (filters: Partial<NicheFilters>) => void;
  sort: SortConfig;
  setSort: (sort: SortConfig) => void;
}

// =============================================================================
// Pure Functions - Data Transforms
// =============================================================================

export const createDefaultFilters = (): NicheFilters => ({
  category: null,
  minDemand: 0,
  maxDemand: 100,
  competitionLevels: ['low', 'medium', 'high'],
  trendDirections: ['up', 'down', 'stable'],
});

export const createDefaultSort = (): SortConfig => ({
  field: 'demandScore',
  direction: 'desc',
});

export const filterData = (
  data: NicheDataPoint[],
  filters: NicheFilters
): NicheDataPoint[] => {
  return data.filter((item) => {
    // Category filter
    if (filters.category && item.category !== filters.category) {
      return false;
    }

    // Demand score range filter
    if (item.demandScore < filters.minDemand || item.demandScore > filters.maxDemand) {
      return false;
    }

    // Competition level filter
    if (!filters.competitionLevels.includes(item.competitionLevel)) {
      return false;
    }

    // Trend direction filter
    if (!filters.trendDirections.includes(item.trendDirection)) {
      return false;
    }

    return true;
  });
};

export const sortData = (
  data: NicheDataPoint[],
  sortConfig: SortConfig
): NicheDataPoint[] => {
  return [...data].sort((a, b) => {
    let comparison = 0;

    switch (sortConfig.field) {
      case 'productName':
        comparison = a.productName.localeCompare(b.productName);
        break;
      case 'demandScore':
        comparison = a.demandScore - b.demandScore;
        break;
      case 'competitionLevel': {
        const order = { low: 0, medium: 1, high: 2 };
        comparison = order[a.competitionLevel] - order[b.competitionLevel];
        break;
      }
      case 'trendDirection': {
        const order = { up: 0, stable: 1, down: 2 };
        comparison = order[a.trendDirection] - order[b.trendDirection];
        break;
      }
    }

    return sortConfig.direction === 'asc' ? comparison : -comparison;
  });
};

export const getUniqueCategories = (data: NicheDataPoint[]): string[] => {
  const categories = new Set<string>();
  data.forEach((item) => categories.add(item.category));
  return Array.from(categories).sort();
};

export const getDemandStats = (
  data: NicheDataPoint[]
): { avg: number; min: number; max: number } => {
  if (data.length === 0) {
    return { avg: 0, min: 0, max: 0 };
  }

  const scores = data.map((d) => d.demandScore);
  return {
    avg: scores.reduce((sum, s) => sum + s, 0) / scores.length,
    min: Math.min(...scores),
    max: Math.max(...scores),
  };
};

// =============================================================================
// Mock Data
// =============================================================================

const generateMockData = (): NicheDataPoint[] => [
  {
    id: 'niche-1',
    productName: 'Беспроводные наушники',
    category: 'Электроника',
    demandScore: 85,
    competitionLevel: 'high',
    trendDirection: 'up',
    avgPrice: 4500,
    topCompetitorPrice: 5200,
    marketShare: 12.5,
    updatedAt: '2026-04-23T10:00:00Z',
  },
  {
    id: 'niche-2',
    productName: 'USB-C кабель 2м',
    category: 'Аксессуары',
    demandScore: 72,
    competitionLevel: 'medium',
    trendDirection: 'stable',
    avgPrice: 450,
    topCompetitorPrice: 480,
    marketShare: 8.3,
    updatedAt: '2026-04-23T10:00:00Z',
  },
  {
    id: 'niche-3',
    productName: 'Защитный чехол для телефона',
    category: 'Аксессуары',
    demandScore: 68,
    competitionLevel: 'high',
    trendDirection: 'down',
    avgPrice: 800,
    topCompetitorPrice: 950,
    marketShare: 15.2,
    updatedAt: '2026-04-23T10:00:00Z',
  },
  {
    id: 'niche-4',
    productName: 'Портативная колонка',
    category: 'Электроника',
    demandScore: 78,
    competitionLevel: 'medium',
    trendDirection: 'up',
    avgPrice: 3200,
    topCompetitorPrice: 3500,
    marketShare: 6.8,
    updatedAt: '2026-04-23T10:00:00Z',
  },
  {
    id: 'niche-5',
    productName: 'Автомобильный держатель',
    category: 'Аксессуары',
    demandScore: 55,
    competitionLevel: 'low',
    trendDirection: 'up',
    avgPrice: 1200,
    topCompetitorPrice: 1100,
    marketShare: 4.2,
    updatedAt: '2026-04-23T10:00:00Z',
  },
  {
    id: 'niche-6',
    productName: 'Фитнес-браслет',
    category: 'Электроника',
    demandScore: 62,
    competitionLevel: 'medium',
    trendDirection: 'stable',
    avgPrice: 2800,
    topCompetitorPrice: 3100,
    marketShare: 7.1,
    updatedAt: '2026-04-23T10:00:00Z',
  },
  {
    id: 'niche-7',
    productName: 'Игровой коврик',
    category: 'Аксессуары',
    demandScore: 45,
    competitionLevel: 'low',
    trendDirection: 'down',
    avgPrice: 1500,
    topCompetitorPrice: 1400,
    marketShare: 3.5,
    updatedAt: '2026-04-23T10:00:00Z',
  },
  {
    id: 'niche-8',
    productName: 'Клавиатура беспроводная',
    category: 'Электроника',
    demandScore: 58,
    competitionLevel: 'medium',
    trendDirection: 'up',
    avgPrice: 2400,
    topCompetitorPrice: 2650,
    marketShare: 5.9,
    updatedAt: '2026-04-23T10:00:00Z',
  },
];

// =============================================================================
// Hook
// =============================================================================

export const useNicheAnalysis = (): UseNicheAnalysisReturn => {
  const [filters, setFiltersState] = useState<NicheFilters>(createDefaultFilters);
  const [sort, setSortState] = useState<SortConfig>(createDefaultSort);

  // Mock data - in real app would come from API
  const allData = useMemo(() => generateMockData(), []);

  // Apply filters and sorting
  const data = useMemo(() => {
    const filtered = filterData(allData, filters);
    return sortData(filtered, sort);
  }, [allData, filters, sort]);

  const setFilters = useCallback((updates: Partial<NicheFilters>) => {
    setFiltersState((prev) => ({ ...prev, ...updates }));
  }, []);

  const setSort = useCallback((newSort: SortConfig) => {
    setSortState(newSort);
  }, []);

  return {
    data,
    isLoading: false,
    filters,
    setFilters,
    sort,
    setSort,
  };
};

export type { UseNicheAnalysisReturn };