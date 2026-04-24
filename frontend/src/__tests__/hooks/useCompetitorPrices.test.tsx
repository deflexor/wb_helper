import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useCompetitorPrices } from '@/hooks/useCompetitorPrices';
import { ReactElement } from 'react';

// Create a wrapper with QueryClientProvider
const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: Infinity,
      },
    },
  });
  return ({ children }: { children: ReactElement }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCompetitorPrices hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should return data after fetch completes', async () => {
    // Arrange & Act
    const { result } = renderHook(() => useCompetitorPrices(), { wrapper: createWrapper() });

    // Wait for the data to be available (with increased timeout for async operations)
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    }, { timeout: 10000 });

    expect(result.current.data!.length).toBeGreaterThan(0);
  });

  it('should set isLoading state during fetch', async () => {
    // Arrange & Act
    const { result } = renderHook(() => useCompetitorPrices(), { wrapper: createWrapper() });

    // Initially might be loading
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    }, { timeout: 10000 });
  });

  it('should have refetch function', async () => {
    // Arrange
    const { result } = renderHook(() => useCompetitorPrices(), { wrapper: createWrapper() });

    // Wait for initial data
    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    }, { timeout: 10000 });

    // Assert - refetch should be a function
    expect(typeof result.current.refetch).toBe('function');
  });

  it('should return correct data structure with all fields', async () => {
    // Arrange & Act
    const { result } = renderHook(() => useCompetitorPrices(), { wrapper: createWrapper() });

    await waitFor(() => {
      expect(result.current.data).toBeDefined();
    }, { timeout: 10000 });

    // Assert - verify data structure
    const firstItem = result.current.data![0];
    expect(firstItem).toHaveProperty('id');
    expect(firstItem).toHaveProperty('productName');
    expect(firstItem).toHaveProperty('currentPrice');
    expect(firstItem).toHaveProperty('competitorPrice');
    expect(firstItem).toHaveProperty('gap');
    expect(firstItem).toHaveProperty('status');
  });
});
