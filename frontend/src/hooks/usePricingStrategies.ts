import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PricingStrategy {
  id: string;
  name: string;
  minMargin: number;
  maxPriceChange: number;
  targetMargin: number;
  autoApply: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface PricingState {
  strategies: PricingStrategy[];
  isLoading: boolean;
  error: string | null;

  // CRUD operations
  createStrategy: (strategy: Omit<PricingStrategy, 'id' | 'createdAt' | 'updatedAt'>) => PricingStrategy;
  updateStrategy: (id: string, updates: Partial<PricingStrategy>) => void;
  deleteStrategy: (id: string) => void;
  setActiveStrategy: (id: string, isActive: boolean) => void;

  // Optimistic update helpers
  applyOptimisticUpdate: (id: string, updates: Partial<PricingStrategy>, previousState: PricingStrategy) => void;
  rollbackOptimisticUpdate: (id: string, previousState: PricingStrategy) => void;
}

const generateId = (): string => {
  return `strategy-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
};

const now = (): string => new Date().toISOString();

export const usePricingStrategies = create<PricingState>()(
  persist(
    (set) => ({
      strategies: [],
      isLoading: false,
      error: null,

      createStrategy: (strategyData) => {
        const newStrategy: PricingStrategy = {
          ...strategyData,
          id: generateId(),
          createdAt: now(),
          updatedAt: now(),
        };

        set((state) => ({
          strategies: [...state.strategies, newStrategy],
        }));

        return newStrategy;
      },

      updateStrategy: (id, updates) => {
        set((state) => ({
          strategies: state.strategies.map((strategy) =>
            strategy.id === id
              ? { ...strategy, ...updates, updatedAt: now() }
              : strategy
          ),
        }));
      },

      deleteStrategy: (id) => {
        set((state) => ({
          strategies: state.strategies.filter((strategy) => strategy.id !== id),
        }));
      },

      setActiveStrategy: (id, isActive) => {
        set((state) => ({
          strategies: state.strategies.map((strategy) =>
            strategy.id === id
              ? { ...strategy, isActive, updatedAt: now() }
              : strategy
          ),
        }));
      },

      // Optimistic update: apply immediately
      applyOptimisticUpdate: (id, updates, _previousState) => {
        set((state) => ({
          strategies: state.strategies.map((strategy) =>
            strategy.id === id
              ? { ...strategy, ...updates, updatedAt: now() }
              : strategy
          ),
        }));
      },

      // Optimistic update: rollback to previous state
      rollbackOptimisticUpdate: (id, previousState) => {
        set((state) => ({
          strategies: state.strategies.map((strategy) =>
            strategy.id === id ? previousState : strategy
          ),
        }));
      },
    }),
    {
      name: 'wbhelper-pricing-strategies',
    }
  )
);
