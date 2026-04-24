import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UsageLimits {
  apiCalls: number;
  apiCallsLimit: number;
  products: number;
  productsLimit: number;
  competitors: number;
  competitorsLimit: number;
}

interface UsageState {
  limits: UsageLimits;
  setLimits: (limits: Partial<UsageLimits>) => void;
  incrementApiCalls: () => void;
  resetUsage: () => void;
}

const defaultLimits: UsageLimits = {
  apiCalls: 0,
  apiCallsLimit: 1000,
  products: 0,
  productsLimit: 50,
  competitors: 0,
  competitorsLimit: 20,
};

export const useUsageStore = create<UsageState>()(
  persist(
    (set) => ({
      limits: defaultLimits,
      setLimits: (newLimits) =>
        set((state) => ({
          limits: { ...state.limits, ...newLimits },
        })),
      incrementApiCalls: () =>
        set((state) => ({
          limits: { ...state.limits, apiCalls: state.limits.apiCalls + 1 },
        })),
      resetUsage: () => set({ limits: defaultLimits }),
    }),
    {
      name: 'wbhelper-usage',
    }
  )
);
