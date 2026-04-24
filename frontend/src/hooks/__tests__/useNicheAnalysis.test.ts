import { describe, it, expect, beforeEach } from 'vitest';
import {
  createDefaultFilters,
  createDefaultSort,
  filterData,
  sortData,
  getUniqueCategories,
  getDemandStats,
  type NicheDataPoint,
  type NicheFilters,
  type SortConfig,
} from '../useNicheAnalysis';

// =============================================================================
// Test Data
// =============================================================================

const mockDataPoints: NicheDataPoint[] = [
  {
    id: '1',
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
    id: '2',
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
    id: '3',
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
    id: '4',
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
    id: '5',
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
];

// =============================================================================
// createDefaultFilters Tests
// =============================================================================

describe('createDefaultFilters', () => {
  it('returns correct default filter values', () => {
    const filters = createDefaultFilters();

    expect(filters.category).toBeNull();
    expect(filters.minDemand).toBe(0);
    expect(filters.maxDemand).toBe(100);
    expect(filters.competitionLevels).toEqual(['low', 'medium', 'high']);
    expect(filters.trendDirections).toEqual(['up', 'down', 'stable']);
  });
});

// =============================================================================
// createDefaultSort Tests
// =============================================================================

describe('createDefaultSort', () => {
  it('returns correct default sort configuration', () => {
    const sort = createDefaultSort();

    expect(sort.field).toBe('demandScore');
    expect(sort.direction).toBe('desc');
  });
});

// =============================================================================
// filterData Tests
// =============================================================================

describe('filterData', () => {
  describe('category filtering', () => {
    it('returns all data when category is null', () => {
      const filters: NicheFilters = {
        ...createDefaultFilters(),
        category: null,
      };

      const result = filterData(mockDataPoints, filters);

      expect(result).toHaveLength(5);
    });

    it('filters data by specific category', () => {
      const filters: NicheFilters = {
        ...createDefaultFilters(),
        category: 'Электроника',
      };

      const result = filterData(mockDataPoints, filters);

      expect(result).toHaveLength(2);
      expect(result.every((d) => d.category === 'Электроника')).toBe(true);
    });
  });

  describe('demand score filtering', () => {
    it('filters by minimum demand score', () => {
      const filters: NicheFilters = {
        ...createDefaultFilters(),
        minDemand: 70,
      };

      const result = filterData(mockDataPoints, filters);

      expect(result).toHaveLength(2);
      expect(result.every((d) => d.demandScore >= 70)).toBe(true);
    });

    it('filters by maximum demand score', () => {
      const filters: NicheFilters = {
        ...createDefaultFilters(),
        maxDemand: 60,
      };

      const result = filterData(mockDataPoints, filters);

      // Only id=4 has demandScore=55 which is <= 60
      expect(result).toHaveLength(1);
      expect(result.every((d) => d.demandScore <= 60)).toBe(true);
    });

    it('filters by demand score range', () => {
      const filters: NicheFilters = {
        ...createDefaultFilters(),
        minDemand: 60,
        maxDemand: 75,
      };

      const result = filterData(mockDataPoints, filters);

      expect(result).toHaveLength(3);
      expect(result.every((d) => d.demandScore >= 60 && d.demandScore <= 75)).toBe(true);
    });
  });

  describe('competition level filtering', () => {
    it('filters by single competition level', () => {
      const filters: NicheFilters = {
        ...createDefaultFilters(),
        competitionLevels: ['low'],
      };

      const result = filterData(mockDataPoints, filters);

      expect(result).toHaveLength(1);
      expect(result[0].competitionLevel).toBe('low');
    });

    it('filters by multiple competition levels', () => {
      const filters: NicheFilters = {
        ...createDefaultFilters(),
        competitionLevels: ['low', 'medium'],
      };

      const result = filterData(mockDataPoints, filters);

      expect(result).toHaveLength(3);
      expect(result.every((d) => d.competitionLevel !== 'high')).toBe(true);
    });

    it('returns empty array when no competition levels match', () => {
      const filters: NicheFilters = {
        ...createDefaultFilters(),
        competitionLevels: [],
      };

      const result = filterData(mockDataPoints, filters);

      expect(result).toHaveLength(0);
    });
  });

  describe('trend direction filtering', () => {
    it('filters by single trend direction', () => {
      const filters: NicheFilters = {
        ...createDefaultFilters(),
        trendDirections: ['up'],
      };

      const result = filterData(mockDataPoints, filters);

      expect(result).toHaveLength(2);
      expect(result.every((d) => d.trendDirection === 'up')).toBe(true);
    });

    it('filters by multiple trend directions', () => {
      const filters: NicheFilters = {
        ...createDefaultFilters(),
        trendDirections: ['up', 'stable'],
      };

      const result = filterData(mockDataPoints, filters);

      expect(result).toHaveLength(4);
      expect(result.every((d) => d.trendDirection !== 'down')).toBe(true);
    });
  });

  describe('combined filtering', () => {
    it('applies multiple filters correctly', () => {
      const filters: NicheFilters = {
        category: 'Электроника',
        minDemand: 60,
        maxDemand: 90,
        competitionLevels: ['medium', 'high'],
        trendDirections: ['up', 'stable'],
      };

      const result = filterData(mockDataPoints, filters);

      expect(result).toHaveLength(2);
      result.forEach((d) => {
        expect(d.category).toBe('Электроника');
        expect(d.demandScore).toBeGreaterThanOrEqual(60);
        expect(d.demandScore).toBeLessThanOrEqual(90);
        expect(['medium', 'high']).toContain(d.competitionLevel);
        expect(['up', 'stable']).toContain(d.trendDirection);
      });
    });
  });

  it('returns empty array when no data matches filters', () => {
    const filters: NicheFilters = {
      category: 'Несуществующая категория',
      minDemand: 90,
      maxDemand: 100,
      competitionLevels: ['low'],
      trendDirections: ['down'],
    };

    const result = filterData(mockDataPoints, filters);

    expect(result).toHaveLength(0);
  });
});

// =============================================================================
// sortData Tests
// =============================================================================

describe('sortData', () => {
  describe('productName sorting', () => {
    it('sorts by productName ascending', () => {
      const sort: SortConfig = { field: 'productName', direction: 'asc' };
      const result = sortData(mockDataPoints, sort);

      // Node.js default localeCompare sorts by Unicode codepoint
      // Latin 'U' (85) > Cyrillic 'А' (1040), so USB-C comes first
      // Actual order: USB-C < Авто < Беспров < Защитный < Фитнес
      expect(result[0].productName).toBe('USB-C кабель 2м');
      expect(result[1].productName).toBe('Автомобильный держатель');
      expect(result[2].productName).toBe('Беспроводные наушники');
      expect(result[3].productName).toBe('Защитный чехол для телефона');
      expect(result[4].productName).toBe('Фитнес-браслет');
    });

    it('sorts by productName descending', () => {
      const sort: SortConfig = { field: 'productName', direction: 'desc' };
      const result = sortData(mockDataPoints, sort);

      // Descending is reverse of ascending
      expect(result[0].productName).toBe('Фитнес-браслет');
      expect(result[1].productName).toBe('Защитный чехол для телефона');
      expect(result[2].productName).toBe('Беспроводные наушники');
      expect(result[3].productName).toBe('Автомобильный держатель');
      expect(result[4].productName).toBe('USB-C кабель 2м');
    });
  });

  describe('demandScore sorting', () => {
    it('sorts by demandScore ascending', () => {
      const sort: SortConfig = { field: 'demandScore', direction: 'asc' };
      const result = sortData(mockDataPoints, sort);

      expect(result[0].demandScore).toBe(55);
      expect(result[4].demandScore).toBe(85);
    });

    it('sorts by demandScore descending', () => {
      const sort: SortConfig = { field: 'demandScore', direction: 'desc' };
      const result = sortData(mockDataPoints, sort);

      expect(result[0].demandScore).toBe(85);
      expect(result[4].demandScore).toBe(55);
    });
  });

  describe('competitionLevel sorting', () => {
    it('sorts by competitionLevel ascending (low → medium → high)', () => {
      const sort: SortConfig = { field: 'competitionLevel', direction: 'asc' };
      const result = sortData(mockDataPoints, sort);

      expect(result[0].competitionLevel).toBe('low');
      expect(result[2].competitionLevel).toBe('medium');
      expect(result[4].competitionLevel).toBe('high');
    });

    it('sorts by competitionLevel descending (high → medium → low)', () => {
      const sort: SortConfig = { field: 'competitionLevel', direction: 'desc' };
      const result = sortData(mockDataPoints, sort);

      expect(result[0].competitionLevel).toBe('high');
      expect(result[2].competitionLevel).toBe('medium');
      expect(result[4].competitionLevel).toBe('low');
    });
  });

  describe('trendDirection sorting', () => {
    it('sorts by trendDirection ascending (up → stable → down)', () => {
      const sort: SortConfig = { field: 'trendDirection', direction: 'asc' };
      const result = sortData(mockDataPoints, sort);

      expect(result[0].trendDirection).toBe('up');
      expect(result[2].trendDirection).toBe('stable');
      expect(result[4].trendDirection).toBe('down');
    });

    it('sorts by trendDirection descending (down → stable → up)', () => {
      const sort: SortConfig = { field: 'trendDirection', direction: 'desc' };
      const result = sortData(mockDataPoints, sort);

      expect(result[0].trendDirection).toBe('down');
      expect(result[2].trendDirection).toBe('stable');
      expect(result[4].trendDirection).toBe('up');
    });
  });

  it('does not mutate original array', () => {
    const sort: SortConfig = { field: 'demandScore', direction: 'desc' };
    const originalData = [...mockDataPoints];

    sortData(mockDataPoints, sort);

    expect(mockDataPoints).toEqual(originalData);
  });

  it('handles empty array', () => {
    const sort: SortConfig = { field: 'demandScore', direction: 'asc' };
    const result = sortData([], sort);

    expect(result).toEqual([]);
  });

  it('handles single item array', () => {
    const sort: SortConfig = { field: 'demandScore', direction: 'asc' };
    const result = sortData([mockDataPoints[0]], sort);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual(mockDataPoints[0]);
  });
});

// =============================================================================
// getUniqueCategories Tests
// =============================================================================

describe('getUniqueCategories', () => {
  it('returns sorted list of unique categories', () => {
    const result = getUniqueCategories(mockDataPoints);

    expect(result).toEqual(['Аксессуары', 'Электроника']);
  });

  it('returns empty array for empty data', () => {
    const result = getUniqueCategories([]);

    expect(result).toEqual([]);
  });

  it('handles single category', () => {
    const singleCategoryData = mockDataPoints.filter((d) => d.category === 'Электроника');
    const result = getUniqueCategories(singleCategoryData);

    expect(result).toEqual(['Электроника']);
  });
});

// =============================================================================
// getDemandStats Tests
// =============================================================================

describe('getDemandStats', () => {
  it('calculates correct average, min, max for non-empty data', () => {
    const result = getDemandStats(mockDataPoints);

    // (85+72+68+55+62)/5 = 342/5 = 68.4
    expect(result.avg).toBeCloseTo(68.4, 1);
    expect(result.min).toBe(55);
    expect(result.max).toBe(85);
  });

  it('returns zeros for empty data', () => {
    const result = getDemandStats([]);

    expect(result.avg).toBe(0);
    expect(result.min).toBe(0);
    expect(result.max).toBe(0);
  });

  it('handles single item', () => {
    const result = getDemandStats([mockDataPoints[0]]);

    expect(result.avg).toBe(85);
    expect(result.min).toBe(85);
    expect(result.max).toBe(85);
  });

  it('handles uniform demand scores', () => {
    const uniformData: NicheDataPoint[] = [
      { ...mockDataPoints[0], demandScore: 50 },
      { ...mockDataPoints[1], demandScore: 50 },
      { ...mockDataPoints[2], demandScore: 50 },
    ];
    const result = getDemandStats(uniformData);

    expect(result.avg).toBe(50);
    expect(result.min).toBe(50);
    expect(result.max).toBe(50);
  });
});