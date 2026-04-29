import { useQuery } from '@tanstack/react-query';

// =============================================================================
// TYPES
// =============================================================================

export type Marketplace = 'wildberries' | 'ozon';

export interface KeywordPosition {
  id: number;
  keywordId: number;
  position: number;
  date: string;
  searchVolume: number;
  url: string | null;
}

export interface UseSeoPositionsOptions {
  marketplace: Marketplace;
  keywordId: number;
}

export interface UseSeoPositionsResult {
  positions: KeywordPosition[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

// =============================================================================
// API FUNCTIONS (Mock - replace with real API calls)
// =============================================================================

const fetchPositions = async (options: UseSeoPositionsOptions): Promise<KeywordPosition[]> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Generate mock position history
  const basePosition = Math.floor(Math.random() * 50) + 10;
  const positions: KeywordPosition[] = [];

  for (let i = 30; i >= 0; i--) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    
    // Simulate some position fluctuation
    const dailyChange = Math.floor(Math.random() * 7) - 3;
    const position = Math.max(1, Math.min(100, basePosition + dailyChange + (i % 7)));

    positions.push({
      id: options.keywordId * 1000 + i,
      keywordId: options.keywordId,
      position,
      date: date.toISOString().split('T')[0],
      searchVolume: Math.floor(Math.random() * 10000) + 1000,
      url: `https://www.wildberries.ru/catalog/${String(options.keywordId)}/product/${String(i)}`,
    });
  }

  return positions.reverse();
};

// =============================================================================
// HOOK
// =============================================================================

export function useSeoPositions(options: UseSeoPositionsOptions): UseSeoPositionsResult {
  const {
    data: positions = [],
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['seo-positions', options.marketplace, options.keywordId],
    queryFn: () => fetchPositions(options),
    staleTime: 60000, // Positions don't change as frequently
    enabled: options.keywordId > 0,
  });

  const handleRefetch = async (): Promise<void> => {
    await refetch();
  };

  return {
    positions,
    isLoading,
    error,
    refetch: handleRefetch,
  };
}
