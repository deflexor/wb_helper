import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { usePricingStrategies, PricingStrategy } from '@/hooks/usePricingStrategies';

describe('usePricingStrategies hook', () => {
  // Clear localStorage before each test to ensure fresh state
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.getItem = vi.fn().mockReturnValue(null);
    localStorage.setItem = vi.fn();
    localStorage.removeItem = vi.fn();
    localStorage.clear = vi.fn();
  });

  it('should create a new strategy with correct properties', async () => {
    // Arrange & Act
    const { result } = renderHook(() => usePricingStrategies());

    let newStrategy: PricingStrategy | undefined;
    act(() => {
      newStrategy = result.current.createStrategy({
        name: 'Test Strategy',
        minMargin: 10,
        maxPriceChange: 5,
        targetMargin: 20,
        autoApply: false,
        isActive: true,
      });
    });

    // Assert - verify the created strategy has all required properties
    expect(newStrategy).toMatchObject({
      name: 'Test Strategy',
      minMargin: 10,
      maxPriceChange: 5,
      targetMargin: 20,
      autoApply: false,
      isActive: true,
    });
    expect(newStrategy?.id).toBeDefined();
    expect(newStrategy?.createdAt).toBeDefined();
    expect(newStrategy?.updatedAt).toBeDefined();
  });

  it('should add created strategy to strategies array', async () => {
    // Arrange
    const { result } = renderHook(() => usePricingStrategies());

    // Act
    act(() => {
      result.current.createStrategy({
        name: 'Test Strategy',
        minMargin: 10,
        maxPriceChange: 5,
        targetMargin: 20,
        autoApply: false,
        isActive: true,
      });
    });

    // Assert - verify strategy was added
    expect(result.current.strategies.length).toBeGreaterThanOrEqual(1);
    const strategy = result.current.strategies.find(s => s.name === 'Test Strategy');
    expect(strategy).toBeDefined();
  });

  it('should update an existing strategy', async () => {
    // Arrange
    const { result } = renderHook(() => usePricingStrategies());

    let strategyId: string;
    act(() => {
      const strategy = result.current.createStrategy({
        name: 'Original Name',
        minMargin: 10,
        maxPriceChange: 5,
        targetMargin: 20,
        autoApply: false,
        isActive: true,
      });
      strategyId = strategy.id;
    });

    // Act - update the strategy
    act(() => {
      result.current.updateStrategy(strategyId!, {
        name: 'Updated Name',
        minMargin: 15,
      });
    });

    // Assert
    const updatedStrategy = result.current.strategies.find(s => s.id === strategyId);
    expect(updatedStrategy?.name).toBe('Updated Name');
    expect(updatedStrategy?.minMargin).toBe(15);
  });

  it('should delete a strategy', async () => {
    // Arrange
    const { result } = renderHook(() => usePricingStrategies());

    let strategyId: string;
    act(() => {
      const strategy = result.current.createStrategy({
        name: 'To Delete',
        minMargin: 10,
        maxPriceChange: 5,
        targetMargin: 20,
        autoApply: false,
        isActive: true,
      });
      strategyId = strategy.id;
    });

    const initialLength = result.current.strategies.length;

    // Act
    act(() => {
      result.current.deleteStrategy(strategyId!);
    });

    // Assert
    const deletedStrategy = result.current.strategies.find(s => s.id === strategyId);
    expect(deletedStrategy).toBeUndefined();
  });

  it('should set active strategy correctly', async () => {
    // Arrange
    const { result } = renderHook(() => usePricingStrategies());

    let strategy1Id: string;
    let strategy2Id: string;
    act(() => {
      const strategy1 = result.current.createStrategy({
        name: 'Strategy 1',
        minMargin: 10,
        maxPriceChange: 5,
        targetMargin: 20,
        autoApply: false,
        isActive: false,
      });
      strategy1Id = strategy1.id;
    });

    act(() => {
      const strategy2 = result.current.createStrategy({
        name: 'Strategy 2',
        minMargin: 10,
        maxPriceChange: 5,
        targetMargin: 20,
        autoApply: false,
        isActive: false,
      });
      strategy2Id = strategy2.id;
    });

    // Act
    act(() => {
      result.current.setActiveStrategy(strategy1Id!, true);
    });

    // Assert
    const s1 = result.current.strategies.find(s => s.id === strategy1Id);
    const s2 = result.current.strategies.find(s => s.id === strategy2Id);
    expect(s1?.isActive).toBe(true);
    expect(s2?.isActive).toBe(false);
  });

  describe('optimistic updates', () => {
    it('should apply optimistic update immediately', async () => {
      // Arrange
      const { result } = renderHook(() => usePricingStrategies());

      let strategyId: string;
      act(() => {
        const strategy = result.current.createStrategy({
          name: 'Original',
          minMargin: 10,
          maxPriceChange: 5,
          targetMargin: 20,
          autoApply: false,
          isActive: false,
        });
        strategyId = strategy.id;
      });

      const originalStrategy = result.current.strategies.find(s => s.id === strategyId);

      // Act
      act(() => {
        result.current.applyOptimisticUpdate(strategyId!, {
          name: 'Optimistically Updated',
        }, originalStrategy!);
      });

      // Assert - update applied immediately
      const updated = result.current.strategies.find(s => s.id === strategyId);
      expect(updated?.name).toBe('Optimistically Updated');
    });

    it('should rollback optimistic update to previous state', async () => {
      // Arrange
      const { result } = renderHook(() => usePricingStrategies());

      let strategyId: string;
      act(() => {
        const strategy = result.current.createStrategy({
          name: 'Original Name',
          minMargin: 10,
          maxPriceChange: 5,
          targetMargin: 20,
          autoApply: false,
          isActive: false,
        });
        strategyId = strategy.id;
      });

      const originalState = { ...result.current.strategies.find(s => s.id === strategyId)! };

      // Apply optimistic update
      act(() => {
        result.current.applyOptimisticUpdate(strategyId!, {
          name: 'Bad Update',
        }, originalState);
      });

      // Act - rollback
      act(() => {
        result.current.rollbackOptimisticUpdate(strategyId!, originalState);
      });

      // Assert - back to original
      const rolledBack = result.current.strategies.find(s => s.id === strategyId);
      expect(rolledBack?.name).toBe('Original Name');
    });
  });
});
