import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// =============================================================================
// TYPES
// =============================================================================

export type Marketplace = 'wildberries' | 'ozon';

export interface SeoKeyword {
  id: number;
  keyword: string;
  articleId: string;
  label: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UseSeoKeywordsOptions {
  marketplace: Marketplace;
  articleId?: string;
  positionRange?: { min: number; max: number };
}

export interface UseSeoKeywordsResult {
  keywords: SeoKeyword[];
  isLoading: boolean;
  error: Error | null;
  addKeyword: (keyword: string, articleId: string) => Promise<void>;
  removeKeyword: (id: number) => Promise<void>;
  updateLabel: (id: number, label: string) => Promise<void>;
}

// =============================================================================
// API FUNCTIONS (Mock - replace with real API calls)
// =============================================================================

const fetchKeywords = async (options: UseSeoKeywordsOptions): Promise<SeoKeyword[]> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock data filtered by marketplace
  const mockKeywords: SeoKeyword[] = [
    {
      id: 1,
      keyword: 'беспроводные наушники',
      articleId: 'art-001',
      label: 'high-volume',
      createdAt: '2026-04-20T10:00:00Z',
      updatedAt: '2026-04-20T10:00:00Z',
    },
    {
      id: 2,
      keyword: 'наушники bluetooth',
      articleId: 'art-001',
      label: null,
      createdAt: '2026-04-21T10:00:00Z',
      updatedAt: '2026-04-21T10:00:00Z',
    },
    {
      id: 3,
      keyword: 'наушники для телефона',
      articleId: 'art-002',
      label: 'low-competition',
      createdAt: '2026-04-22T10:00:00Z',
      updatedAt: '2026-04-22T10:00:00Z',
    },
  ];

  // Filter by articleId if provided
  let filtered = mockKeywords;
  if (options.articleId) {
    filtered = filtered.filter((kw) => kw.articleId === options.articleId);
  }

  // Filter by position range if provided
  if (options.positionRange) {
    // In production, this would filter by actual position data
    filtered = filtered.slice(options.positionRange.min, options.positionRange.max);
  }

  return filtered;
};

const addKeywordApi = async (keyword: string, articleId: string): Promise<SeoKeyword> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    id: Date.now(),
    keyword,
    articleId,
    label: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const removeKeywordApi = async (_id: number): Promise<void> => {
  void _id; // TODO: Use id for real API call
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));
};

const updateLabelApi = async (id: number, label: string): Promise<SeoKeyword> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    id,
    keyword: 'updated-keyword',
    articleId: 'art-updated',
    label,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

// =============================================================================
// HOOK
// =============================================================================

export function useSeoKeywords(options: UseSeoKeywordsOptions): UseSeoKeywordsResult {
  const queryClient = useQueryClient();

  // Query for keywords
  const {
    data: keywords = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['seo-keywords', options.marketplace, options.articleId, options.positionRange],
    queryFn: () => fetchKeywords(options),
    staleTime: 30000,
  });

  // Mutation for adding keyword
  const addKeywordMutation = useMutation({
    mutationFn: ({ keyword, articleId }: { keyword: string; articleId: string }) =>
      addKeywordApi(keyword, articleId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-keywords', options.marketplace] });
    },
  });

  // Mutation for removing keyword
  const removeKeywordMutation = useMutation({
    mutationFn: (id: number) => removeKeywordApi(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-keywords', options.marketplace] });
    },
  });

  // Mutation for updating label
  const updateLabelMutation = useMutation({
    mutationFn: ({ id, label }: { id: number; label: string }) => updateLabelApi(id, label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-keywords', options.marketplace] });
    },
  });

  const addKeyword = async (keyword: string, articleId: string): Promise<void> => {
    await addKeywordMutation.mutateAsync({ keyword, articleId });
  };

  const removeKeyword = async (id: number): Promise<void> => {
    await removeKeywordMutation.mutateAsync(id);
  };

  const updateLabel = async (id: number, label: string): Promise<void> => {
    await updateLabelMutation.mutateAsync({ id, label });
  };

  return {
    keywords,
    isLoading,
    error: error ?? null,
    addKeyword,
    removeKeyword,
    updateLabel,
  };
}
