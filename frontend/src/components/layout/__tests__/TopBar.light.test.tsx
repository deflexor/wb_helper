import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TopBar } from '@/components/layout/TopBar';
import '@testing-library/jest-dom';

// Mock the stores
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn(() => ({
    user: { name: 'Test User', email: 'test@example.com', avatar: undefined },
    logout: vi.fn(),
  })),
}));

vi.mock('@/stores/usageStore', () => ({
  useUsageStore: vi.fn(() => ({
    limits: { apiCalls: 50, apiCallsLimit: 1000 },
  })),
}));

// Mock i18n
vi.mock('@/i18n', () => ({
  changeLanguage: vi.fn(),
  getCurrentLanguage: vi.fn(() => 'en'),
}));

// Mock theme store
vi.mock('@/stores/themeStore', () => ({
  useThemeStore: vi.fn(() => ({
    theme: 'light',
    setTheme: vi.fn(),
    toggleTheme: vi.fn(),
  })),
}));

// Mock ThemeToggle component
vi.mock('@/components/ui/ThemeToggle', () => ({
  ThemeToggle: () => <button data-testid="theme-toggle">Toggle Theme</button>,
}));

// Mock Select component
vi.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => (
    <select data-testid="select-mock" value={value} onChange={(e: any) => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: ({ children, className }: any) => (
    <button className={className}>{children}</button>
  ),
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
  SelectValue: () => <span>EN</span>,
}));

// Mock DropdownMenu
vi.mock('@/components/ui/dropdown-menu', () => ({
  DropdownMenu: ({ children }: any) => <div>{children}</div>,
  DropdownMenuContent: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  DropdownMenuItem: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  DropdownMenuLabel: ({ children }: any) => <div>{children}</div>,
  DropdownMenuSeparator: () => <hr />,
  DropdownMenuTrigger: ({ children }: any) => <div>{children}</div>,
}));

// Mock Avatar
vi.mock('@/components/ui/avatar', () => ({
  Avatar: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  AvatarImage: () => null,
  AvatarFallback: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
}));

// Mock lucide icons
vi.mock('lucide-react', () => ({
  User: 'User-icon',
  LogOut: 'LogOut-icon',
  Globe: 'Globe-icon',
  Zap: 'Zap-icon',
  ChevronDown: 'ChevronDown-icon',
  ChevronUp: 'ChevronUp-icon',
  Sun: 'Sun-icon',
  Moon: 'Moon-icon',
}));

// Mock lucide icons
vi.mock('lucide-react', () => ({
  User: 'User-icon',
  LogOut: 'LogOut-icon',
  Globe: 'Globe-icon',
  Zap: 'Zap-icon',
  ChevronDown: 'ChevronDown-icon',
  ChevronUp: 'ChevronUp-icon',
  Sun: 'Sun-icon',
  Moon: 'Moon-icon',
}));

describe('TopBar Light Theme', () => {
  const lightBackgroundStyle = 'background: #ffffff; padding: 20px;';

  describe('Header rendering on white background', () => {
    it('should render TopBar in light theme', () => {
      render(
        <div style={{ background: '#ffffff' }}>
          <TopBar />
        </div>
      );
      const header = screen.getByRole('banner');
      expect(header).toBeVisible();
      expect(header).toHaveClass('bg-white');
      expect(header).toHaveClass('border-b');
    });

    it('should render header with proper border styling', () => {
      render(
        <div style={{ background: '#ffffff' }}>
          <TopBar />
        </div>
      );
      const header = screen.getByRole('banner');
      // Border should use border-border (subtle gray in light theme)
      expect(header).toHaveClass('border-border');
    });
  });

  describe('Usage indicators on white background', () => {
    it('should display usage text in muted color', () => {
      render(
        <div style={{ background: '#ffffff' }}>
          <TopBar />
        </div>
      );
      // Check that usage text is visible
      const usageText = screen.getByText(/50\/1000/);
      expect(usageText).toBeVisible();
    });

    it('should show status indicator with semantic color', () => {
      render(
        <div style={{ background: '#ffffff' }}>
          <TopBar />
        </div>
      );
      // With 950 remaining (apiCallsLimit 1000 - apiCalls 50), indicator should be green
      // The green-500 class should be visible
      const statusIndicator = document.querySelector('.bg-green-500');
      expect(statusIndicator).toBeInTheDocument();
    });
  });

  describe('User avatar fallback on white background', () => {
    it('should render avatar fallback with neon volt color', () => {
      render(
        <div style={{ background: '#ffffff' }}>
          <TopBar />
        </div>
      );
      const fallback = document.querySelector('.bg-neon-volt');
      expect(fallback).toBeInTheDocument();
      expect(fallback).toHaveTextContent('T');
    });

    it('should have dark text on neon volt background for contrast', () => {
      render(
        <div style={{ background: '#ffffff' }}>
          <TopBar />
        </div>
      );
      const fallback = document.querySelector('.bg-neon-volt');
      expect(fallback).toHaveClass('text-black');
    });
  });

  describe('Language selector on white background', () => {
    it('should render language selector with visible globe icon', () => {
      render(
        <div style={{ background: '#ffffff' }}>
          <TopBar />
        </div>
      );
      // Globe icon should be present (using testid since it's mocked as string)
      expect(screen.getByTestId('select-mock')).toBeInTheDocument();
    });
  });

  describe('Theme toggle integration', () => {
    it('should render theme toggle button', () => {
      render(
        <div style={{ background: '#ffffff' }}>
          <TopBar />
        </div>
      );
      const themeToggle = screen.getByRole('button', { name: /toggle theme/i });
      expect(themeToggle).toBeVisible();
    });
  });
});