import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from './setup';
import { Hello } from '@/pages/Hello';
import i18n from '@/i18n';
import '@testing-library/jest-dom';

describe('Hello', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the Hello World page with title and greeting', async () => {
    // Arrange - render the Hello component wrapped with providers
    const { getByText } = renderWithProviders(<Hello />);

    // Assert - check that title and greeting are displayed
    // Using i18n to get the translated strings
    const title = i18n.t('hello.title');
    const greeting = i18n.t('hello.greeting');

    expect(getByText(title)).toBeInTheDocument();
    expect(getByText(greeting)).toBeInTheDocument();
  });

  it('should display language selector with EN and RU options', async () => {
    const { getByText, getByRole } = renderWithProviders(<Hello />);

    const languageLabel = i18n.t('hello.language');
    expect(getByText(languageLabel)).toBeInTheDocument();

    // Check for language toggle buttons
    const enButton = getByRole('button', { name: /en/i });
    const ruButton = getByRole('button', { name: /ru/i });
    expect(enButton).toBeInTheDocument();
    expect(ruButton).toBeInTheDocument();
  });

  it('should switch language when language button is clicked', async () => {
    const { getByRole, getByText } = renderWithProviders(<Hello />);

    const ruButton = getByRole('button', { name: /ru/i });

    // Act - click the RU button
    await ruButton.click();

    // Assert - after clicking, the content should be in Russian
    const russianTitle = i18n.t('hello.title', { lng: 'ru' });
    expect(getByText(russianTitle)).toBeInTheDocument();
  });
});