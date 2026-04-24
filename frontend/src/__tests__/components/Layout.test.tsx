import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../setup.tsx';
import { Sidebar } from '@/components/layout/Sidebar';
import { TopBar } from '@/components/layout/TopBar';
import { useSidebarStore } from '@/stores/sidebarStore';
import { useAuthStore } from '@/stores/authStore';
import { useUsageStore } from '@/stores/usageStore';
import i18n from '@/i18n';
import '@testing-library/jest-dom';

// Mock stores
vi.mock('@/stores/sidebarStore', () => ({
  useSidebarStore: vi.fn().mockReturnValue({
    isCollapsed: false,
    isMobileOpen: false,
    toggleCollapse: vi.fn(),
    toggleMobile: vi.fn(),
    closeMobile: vi.fn(),
  }),
}));

vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn().mockReturnValue({
    user: { id: '1', email: 'test@example.com', name: 'Test User', subscriptionPlan: 'free', apiCallsLimit: 1000 },
    logout: vi.fn(),
  }),
}));

vi.mock('@/stores/usageStore', () => ({
  useUsageStore: vi.fn().mockReturnValue({
    limits: { apiCalls: 100, apiCallsLimit: 1000, products: 10, productsLimit: 100 },
  }),
}));

describe('Sidebar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render with all navigation items', async () => {
    // Arrange
    const { getByText } = renderWithProviders(<Sidebar />);

    // Assert - check all nav items are rendered
    expect(getByText(i18n.t('layout.dashboard'))).toBeInTheDocument();
    expect(getByText(i18n.t('layout.competitors'))).toBeInTheDocument();
    expect(getByText(i18n.t('layout.optimization'))).toBeInTheDocument();
    expect(getByText(i18n.t('layout.settings'))).toBeInTheDocument();
  });
});

describe('TopBar', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the topbar', async () => {
    // Arrange
    const { getByText, container } = renderWithProviders(<TopBar />);

    // Assert - basic rendering verification
    expect(container.firstChild).toBeInTheDocument();
  });
});
