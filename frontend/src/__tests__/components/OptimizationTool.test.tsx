import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../setup.tsx';
import { PricingStrategyForm } from '@/components/features/optimization/PricingStrategyForm';
import { PricingPreview } from '@/components/features/optimization/PricingPreview';
import { PricingConfirmation } from '@/components/features/optimization/PricingConfirmation';
import i18n from '@/i18n';
import '@testing-library/jest-dom';
import { fireEvent, waitFor } from '@testing-library/react';

describe('PricingStrategyForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the form with all required elements', async () => {
    // Arrange
    const onApply = vi.fn();
    const { getByText } = renderWithProviders(
      <PricingStrategyForm onApply={onApply} />
    );

    // Assert - verify form elements are present (using partial text match)
    expect(getByText(i18n.t('optimization.optimizationSettings'))).toBeInTheDocument();
    // The labels show like "Minimum Margin (10%)" so partial text match
    expect(getByText(/minimum margin/i)).toBeInTheDocument();
    expect(getByText(/maximum price/i)).toBeInTheDocument();
    expect(getByText(/target margin/i)).toBeInTheDocument();
  });

  it('should call onApply when valid form is submitted', async () => {
    // Arrange
    const onApply = vi.fn();
    const { getByRole } = renderWithProviders(
      <PricingStrategyForm onApply={onApply} />
    );

    // Act - submit form
    const submitButton = getByRole('button', { name: i18n.t('optimization.apply') });
    fireEvent.click(submitButton);

    // Assert
    await waitFor(() => {
      expect(onApply).toHaveBeenCalled();
    });
  });
});

describe('PricingPreview', () => {
  it('should render with provided values', async () => {
    // Arrange
    const { getByText } = renderWithProviders(
      <PricingPreview
        currentMargin={15}
        newMargin={20}
        estimatedProfitChange={500}
        minMargin={10}
        maxPriceChange={5}
        targetMargin={20}
      />
    );

    // Assert
    expect(getByText('15.0%')).toBeInTheDocument();
    expect(getByText('20.0%')).toBeInTheDocument();
    expect(getByText('+500.00 ₽')).toBeInTheDocument();
  });
});

describe('PricingConfirmation', () => {
  it('should show dialog when open', async () => {
    // Arrange
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const onOpenChange = vi.fn();

    const { getByText } = renderWithProviders(
      <PricingConfirmation
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        onCancel={onCancel}
        affectedProductCount={10}
        newMargin={20}
        currentMargin={15}
        estimatedProfitChange={500}
      />
    );

    // Assert
    expect(getByText(i18n.t('optimization.confirmApply'))).toBeInTheDocument();
  });

  it('should call onConfirm when confirm is clicked', async () => {
    // Arrange
    const onConfirm = vi.fn();
    const onCancel = vi.fn();
    const onOpenChange = vi.fn();

    const { getByRole } = renderWithProviders(
      <PricingConfirmation
        open={true}
        onOpenChange={onOpenChange}
        onConfirm={onConfirm}
        onCancel={onCancel}
        affectedProductCount={10}
        newMargin={20}
        currentMargin={15}
        estimatedProfitChange={500}
      />
    );

    // Act
    const confirmButton = getByRole('button', { name: i18n.t('common.confirm') });
    fireEvent.click(confirmButton);

    // Assert
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
