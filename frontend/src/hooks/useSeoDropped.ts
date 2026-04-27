import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// =============================================================================
// TYPES
// =============================================================================

export type Marketplace = 'wildberries' | 'ozon';

export interface DroppedKeyword {
  id: number;
  keyword: string;
  articleId: string;
  previousPosition: number;
  currentPosition: number;
  dropDate: string;
  dropPercentage: number;
  recoveryDifficulty: 'easy' | 'medium' | 'hard';
}

export interface UseSeoDroppedOptions {
  marketplace: Marketplace;
  articleId?: string;
}

export interface UseSeoDroppedResult {
  droppedKeywords: DroppedKeyword[];
  isLoading: boolean;
  error: Error | null;
  checkForDrops: () => Promise<void>;
  getRecoverySuggestions: (keywordId: number) => Promise<string[]>;
}

// =============================================================================
// API FUNCTIONS (Mock - replace with real API calls)
// =============================================================================

const fetchDroppedKeywords = async (options: UseSeoDroppedOptions): Promise<DroppedKeyword[]> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock dropped keywords data
  const mockDropped: DroppedKeyword[] = [
    {
      id: 1,
      keyword: 'беспроводные наушники',
      articleId: 'art-001',
      previousPosition: 5,
      currentPosition: 45,
      dropDate: '2026-04-25',
      dropPercentage: 80,
      recoveryDifficulty: 'medium',
    },
    {
      id: 2,
      keyword: 'наушники premium',
      articleId: 'art-001',
      previousPosition: 12,
      currentPosition: 78,
      dropDate: '2026-04-24',
      dropPercentage: 92,
      recoveryDifficulty: 'hard',
    },
    {
      id: 3,
      keyword: 'наушники для спорта',
      articleId: 'art-002',
      previousPosition: 8,
      currentPosition: 32,
      dropDate: '2026-04-23',
      dropPercentage: 75,
      recoveryDifficulty: 'easy',
    },
  ];

  // Filter by articleId if provided
  if (options.articleId) {
    return mockDropped.filter((kw) => kw.articleId === options.articleId);
  }

  return mockDropped;
};

const getRecoverySuggestionsApi = async (_keywordId: number): Promise<string[]> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  // Mock recovery suggestions based on keywordId
  return [
    'Optimize product title with main keyword',
    'Add more relevant keywords to description',
    'Increase product rating through reviews',
    'Lower price to improve competitive position',
    'Add product images with keyword-rich alt text',
  ];
};

const checkForDropsApi = async (_options: UseSeoDroppedOptions): Promise<void> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));
};

// =============================================================================
// HOOK
// =============================================================================

export function useSeoDropped(options?: UseSeoDroppedOptions): UseSeoDroppedResult {
  const queryClient = useQueryClient();

  const queryOptions = options ?? { marketplace: 'wildberries' as Marketplace };

  // Query for dropped keywords
  const {
    data: droppedKeywords = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['seo-dropped', queryOptions.marketplace, queryOptions.articleId],
    queryFn: () => fetchDroppedKeywords(queryOptions),
    staleTime: 30000,
  });

  // Mutation for checking drops
  const checkForDropsMutation = useMutation({
    mutationFn: () => checkForDropsApi(queryOptions),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-dropped', queryOptions.marketplace] });
    },
  });

  const checkForDrops = async (): Promise<void> => {
    await checkForDropsMutation.mutateAsync();
  };

  const getRecoverySuggestions = async (keywordId: number): Promise<string[]> => {
    return getRecoverySuggestionsApi(keywordId);
  };

  return {
    droppedKeywords,
    isLoading,
    error: error ?? null,
    checkForDrops,
    getRecoverySuggestions,
  };
}
