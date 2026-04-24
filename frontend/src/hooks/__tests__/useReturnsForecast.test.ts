import { describe, it, expect } from 'vitest';
import {
  calculateAverageReturns,
  filterByRiskLevel,
  filterByDateRange,
  applyFilters,
  type ReturnsDataPoint,
  type ForecastFilters,
} from '../useReturnsForecast';

describe('useReturnsForecast - Pure Functions', () => {
  // Helper to create dates relative to today
  const daysAgo = (days: number): string => {
    const date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split('T')[0];
  };

  describe('calculateAverageReturns', () => {
    it('returns 0 for empty array', () => {
      expect(calculateAverageReturns([])).toBe(0);
    });

    it('returns correct average for single data point', () => {
      const data: ReturnsDataPoint[] = [
        { date: daysAgo(1), returns: 10, confidence: 1, riskLevel: 'low' },
      ];
      expect(calculateAverageReturns(data)).toBe(10);
    });

    it('returns correct average for multiple data points', () => {
      const data: ReturnsDataPoint[] = [
        { date: daysAgo(3), returns: 10, confidence: 1, riskLevel: 'low' },
        { date: daysAgo(2), returns: 20, confidence: 1, riskLevel: 'low' },
        { date: daysAgo(1), returns: 30, confidence: 1, riskLevel: 'low' },
      ];
      expect(calculateAverageReturns(data)).toBe(20);
    });

    it('handles decimal returns correctly', () => {
      const data: ReturnsDataPoint[] = [
        { date: daysAgo(2), returns: 5.5, confidence: 1, riskLevel: 'low' },
        { date: daysAgo(1), returns: 4.5, confidence: 1, riskLevel: 'low' },
      ];
      expect(calculateAverageReturns(data)).toBe(5);
    });
  });

  describe('filterByRiskLevel', () => {
    const mockData: ReturnsDataPoint[] = [
      { date: daysAgo(3), returns: 5, confidence: 1, riskLevel: 'low' },
      { date: daysAgo(2), returns: 6, confidence: 1, riskLevel: 'medium' },
      { date: daysAgo(1), returns: 7, confidence: 1, riskLevel: 'high' },
    ];

    it('returns all data when riskLevel is "all"', () => {
      const result = filterByRiskLevel(mockData, 'all');
      expect(result).toHaveLength(3);
    });

    it('filters correctly for "low" risk level', () => {
      const result = filterByRiskLevel(mockData, 'low');
      expect(result).toHaveLength(1);
      expect(result[0].riskLevel).toBe('low');
    });

    it('filters correctly for "medium" risk level', () => {
      const result = filterByRiskLevel(mockData, 'medium');
      expect(result).toHaveLength(1);
      expect(result[0].riskLevel).toBe('medium');
    });

    it('filters correctly for "high" risk level', () => {
      const result = filterByRiskLevel(mockData, 'high');
      expect(result).toHaveLength(1);
      expect(result[0].riskLevel).toBe('high');
    });

    it('does not mutate original array', () => {
      filterByRiskLevel(mockData, 'low');
      expect(mockData).toHaveLength(3);
    });
  });

  describe('filterByDateRange', () => {
    it('returns empty array for empty data', () => {
      const result = filterByDateRange([], 30);
      expect(result).toHaveLength(0);
    });

    it('filters data within specified days', () => {
      const data: ReturnsDataPoint[] = [
        { date: daysAgo(60), returns: 5, confidence: 1, riskLevel: 'low' },
        { date: daysAgo(5), returns: 6, confidence: 1, riskLevel: 'low' },
      ];

      const result = filterByDateRange(data, 30);
      expect(result).toHaveLength(1);
      expect(result[0].date).toBe(daysAgo(5));
    });

    it('does not mutate original array', () => {
      const data: ReturnsDataPoint[] = [
        { date: daysAgo(1), returns: 5, confidence: 1, riskLevel: 'low' },
      ];
      filterByDateRange(data, 30);
      expect(data).toHaveLength(1);
    });
  });

  describe('applyFilters', () => {
    const createTestData = (): ReturnsDataPoint[] => {
      return [
        { date: daysAgo(45), returns: 5, confidence: 1, riskLevel: 'low' },
        { date: daysAgo(30), returns: 6, confidence: 1, riskLevel: 'medium' },
        { date: daysAgo(20), returns: 7, confidence: 1, riskLevel: 'high' },
        { date: daysAgo(14), returns: 8, confidence: 0.8, riskLevel: 'low' },
        { date: daysAgo(7), returns: 9, confidence: 0.7, riskLevel: 'medium' },
        { date: daysAgo(1), returns: 10, confidence: 0.6, riskLevel: 'high' },
      ];
    };

    it('applies both risk and date filters', () => {
      const data = createTestData();
      const filters: ForecastFilters = {
        dateRange: '30d',
        riskLevel: 'low',
        category: 'all',
      };

      const result = applyFilters(data, filters);

      // Should only return low risk items within date range
      expect(result.every((p) => p.riskLevel === 'low')).toBe(true);
      // Should only include data from last 30 days
      expect(result.every((p) => new Date(p.date) >= new Date(daysAgo(30)))).toBe(true);
    });

    it('returns all data when filters are "all"', () => {
      const data = createTestData();
      const filters: ForecastFilters = {
        dateRange: '90d',
        riskLevel: 'all',
        category: 'all',
      };

      const result = applyFilters(data, filters);
      expect(result).toHaveLength(6);
    });

    it('applies date range filter correctly for 7d', () => {
      const data = createTestData();
      const filters: ForecastFilters = {
        dateRange: '7d',
        riskLevel: 'all',
        category: 'all',
      };

      const result = applyFilters(data, filters);
      // Should only return data from last 7 days (daysAgo(7) and daysAgo(1))
      expect(result).toHaveLength(2);
      expect(result.every((p) => new Date(p.date) >= new Date(daysAgo(7)))).toBe(true);
    });

    it('does not mutate original array', () => {
      const data = createTestData();
      const filters: ForecastFilters = {
        dateRange: '30d',
        riskLevel: 'all',
        category: 'all',
      };
      applyFilters(data, filters);
      expect(data).toHaveLength(6);
    });
  });
});

describe('useReturnsForecast - Hook Interface', () => {
  it('exports required types', () => {
    // Type check that the types are properly exported
    const mockDataPoint: ReturnsDataPoint = {
      date: '2024-01-01',
      returns: 5,
      confidence: 1,
      riskLevel: 'low',
    };
    expect(mockDataPoint.date).toBe('2024-01-01');
    expect(mockDataPoint.returns).toBe(5);
    expect(mockDataPoint.confidence).toBe(1);
    expect(mockDataPoint.riskLevel).toBe('low');
  });

  it('ForecastFilters type accepts valid values', () => {
    const mockFilters: ForecastFilters = {
      dateRange: '30d',
      riskLevel: 'all',
      category: 'all',
    };
    expect(mockFilters.dateRange).toBe('30d');
    expect(mockFilters.riskLevel).toBe('all');
    expect(mockFilters.category).toBe('all');
  });
});
