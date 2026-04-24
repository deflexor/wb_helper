import { useQuery } from '@tanstack/react-query';

export type PriceStatus = 'opportunity' | 'risk' | 'neutral';

export interface CompetitorPrice {
  id: string;
  productName: string;
  currentPrice: number;
  competitorPrice: number;
  gap: number;
  status: PriceStatus;
}

const generateMockData = (): CompetitorPrice[] => {
  const products: CompetitorPrice[] = [];
  
  for (let i = 1; i <= 50; i++) {
    const currentPrice = Math.floor(Math.random() * 9901) + 100; // 100-10000
    const competitorMultiplier = Math.random() * 0.2 + 0.9; // 90-110% of current
    const competitorPrice = Math.round(currentPrice * competitorMultiplier * 100) / 100;
    const gap = Math.round((currentPrice - competitorPrice) * 100) / 100;
    
    let status: PriceStatus;
    if (gap > 0) {
      status = 'opportunity';
    } else if (gap < -5) {
      status = 'risk';
    } else {
      status = 'neutral';
    }
    
    products.push({
      id: `product-${i}`,
      productName: `Product ${String.fromCharCode(64 + i)}`,
      currentPrice,
      competitorPrice,
      gap,
      status,
    });
  }
  
  return products;
};

const fetchCompetitorPrices = async (): Promise<CompetitorPrice[]> => {
  // Simulate 500ms network delay
  await new Promise((resolve) => setTimeout(resolve, 500));
  return generateMockData();
};

export interface UseCompetitorPricesResult {
  data: CompetitorPrice[] | undefined;
  isLoading: boolean;
  isFetching: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useCompetitorPrices(): UseCompetitorPricesResult {
  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey: ['competitor-prices'],
    queryFn: fetchCompetitorPrices,
    staleTime: 30000,
    placeholderData: (previousData) => previousData,
  });

  return {
    data,
    isLoading,
    isFetching,
    error,
    refetch,
  };
}
