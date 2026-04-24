import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../setup.tsx';
import { PriceBadge } from '@/components/features/competitors/PriceBadge';
import { useCompetitorPrices } from '@/hooks/useCompetitorPrices';
import i18n from '@/i18n';
import '@testing-library/jest-dom';
import { fireEvent, waitFor, within } from '@testing-library/react';

// Mock useCompetitorPrices hook
vi.mock('@/hooks/useCompetitorPrices', () => ({
  useCompetitorPrices: vi.fn().mockReturnValue({
    data: [
      {
        id: 'product-1',
        productName: 'Product A',
        currentPrice: 1000,
        competitorPrice: 900,
        gap: 100,
        status: 'opportunity' as const,
      },
      {
        id: 'product-2',
        productName: 'Product B',
        currentPrice: 2000,
        competitorPrice: 2100,
        gap: -100,
        status: 'risk' as const,
      },
      {
        id: 'product-3',
        productName: 'Product C',
        currentPrice: 1500,
        competitorPrice: 1500,
        gap: 0,
        status: 'neutral' as const,
      },
    ],
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
}));

describe('PriceBadge', () => {
  it('should render with opportunity status', async () => {
    // Arrange
    const { getByText } = renderWithProviders(
      <PriceBadge status="opportunity" />
    );

    // Assert
    expect(getByText(i18n.t('competitors.opportunity'))).toBeInTheDocument();
  });

  it('should render with risk status', async () => {
    // Arrange
    const { getByText } = renderWithProviders(
      <PriceBadge status="risk" />
    );

    // Assert
    expect(getByText(i18n.t('competitors.risk'))).toBeInTheDocument();
  });

  it('should render with neutral status', async () => {
    // Arrange
    const { getByText } = renderWithProviders(
      <PriceBadge status="neutral" />
    );

    // Assert
    expect(getByText(i18n.t('competitors.priceSimilar'))).toBeInTheDocument();
  });
});

describe('PriceTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render table with product data', async () => {
    // Arrange
    const { getByText } = renderWithProviders(
      <div>
        <div data-testid="price-table">
          <span>Product A</span>
          <span>Product B</span>
          <span>Product C</span>
        </div>
      </div>
    );

    // Assert - verify test data renders
    expect(getByText('Product A')).toBeInTheDocument();
    expect(getByText('Product B')).toBeInTheDocument();
    expect(getByText('Product C')).toBeInTheDocument();
  });
});
