import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

// =============================================================================
// TYPES
// =============================================================================

export type Marketplace = 'wildberries' | 'ozon';

export interface KeywordCluster {
  id: number;
  name: string;
  keywordIds: number[];
  articleId: string | null;
  avgPosition: number;
  totalSearchVolume: number;
  createdAt: string;
  updatedAt: string;
}

export interface UseSeoClustersOptions {
  marketplace: Marketplace;
}

export interface UseSeoClustersResult {
  clusters: KeywordCluster[];
  isLoading: boolean;
  error: Error | null;
  createCluster: (keywordIds: number[], name: string) => Promise<KeywordCluster>;
  mergeClusters: (clusterIds: number[]) => Promise<KeywordCluster>;
  deleteCluster: (clusterId: number) => Promise<void>;
}

// =============================================================================
// API FUNCTIONS (Mock - replace with real API calls)
// =============================================================================

const fetchClusters = async (_marketplace: Marketplace): Promise<KeywordCluster[]> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  // Mock clusters data
  const mockClusters: KeywordCluster[] = [
    {
      id: 1,
      name: 'Wireless Headphones Core',
      keywordIds: [1, 2, 3],
      articleId: 'art-001',
      avgPosition: 12.3,
      totalSearchVolume: 45000,
      createdAt: '2026-04-15T10:00:00Z',
      updatedAt: '2026-04-20T10:00:00Z',
    },
    {
      id: 2,
      name: 'Sport Headphones',
      keywordIds: [4, 5, 6],
      articleId: 'art-002',
      avgPosition: 24.7,
      totalSearchVolume: 28000,
      createdAt: '2026-04-16T10:00:00Z',
      updatedAt: '2026-04-21T10:00:00Z',
    },
    {
      id: 3,
      name: 'Budget Headphones',
      keywordIds: [7, 8],
      articleId: null,
      avgPosition: 67.2,
      totalSearchVolume: 15000,
      createdAt: '2026-04-17T10:00:00Z',
      updatedAt: '2026-04-22T10:00:00Z',
    },
  ];

  return mockClusters;
};

const createClusterApi = async (
  keywordIds: number[],
  name: string
): Promise<KeywordCluster> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));

  return {
    id: Date.now(),
    name,
    keywordIds,
    articleId: null,
    avgPosition: 0,
    totalSearchVolume: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const mergeClustersApi = async (clusterIds: number[]): Promise<KeywordCluster> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500));

  return {
    id: Date.now(),
    name: `Merged Cluster ${clusterIds.join('-')}`,
    keywordIds: clusterIds.flatMap((id) => [id * 10, id * 10 + 1]),
    articleId: null,
    avgPosition: 0,
    totalSearchVolume: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
};

const deleteClusterApi = async (_clusterId: number): Promise<void> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 300));
};

// =============================================================================
// HOOK
// =============================================================================

export function useSeoClusters(options: UseSeoClustersOptions): UseSeoClustersResult {
  const queryClient = useQueryClient();

  // Query for clusters
  const {
    data: clusters = [],
    isLoading,
    error,
  } = useQuery({
    queryKey: ['seo-clusters', options.marketplace],
    queryFn: () => fetchClusters(options.marketplace),
    staleTime: 30000,
  });

  // Mutation for creating cluster
  const createClusterMutation = useMutation({
    mutationFn: ({ keywordIds, name }: { keywordIds: number[]; name: string }) =>
      createClusterApi(keywordIds, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-clusters', options.marketplace] });
    },
  });

  // Mutation for merging clusters
  const mergeClustersMutation = useMutation({
    mutationFn: (clusterIds: number[]) => mergeClustersApi(clusterIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-clusters', options.marketplace] });
    },
  });

  // Mutation for deleting cluster
  const deleteClusterMutation = useMutation({
    mutationFn: (clusterId: number) => deleteClusterApi(clusterId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seo-clusters', options.marketplace] });
    },
  });

  const createCluster = async (keywordIds: number[], name: string): Promise<KeywordCluster> => {
    return createClusterMutation.mutateAsync({ keywordIds, name });
  };

  const mergeClusters = async (clusterIds: number[]): Promise<KeywordCluster> => {
    return mergeClustersMutation.mutateAsync(clusterIds);
  };

  const deleteCluster = async (clusterId: number): Promise<void> => {
    await deleteClusterMutation.mutateAsync(clusterId);
  };

  return {
    clusters,
    isLoading,
    error: error ?? null,
    createCluster,
    mergeClusters,
    deleteCluster,
  };
}
