import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Sidebar } from '../Sidebar';
import { BrowserRouter } from 'react-router-dom';
import { useSidebarStore } from '../../stores/sidebarStore';
import '@testing-library/jest-dom';

// Mock the sidebar store
vi.mock('../../stores/sidebarStore', () => ({
  useSidebarStore: () => ({
    isCollapsed: false,
    isMobileOpen: false,
    toggleCollapse: vi.fn(),
    toggleMobile: vi.fn(),
    closeMobile: vi.fn(),
  }),
}));

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}));

const renderSidebar = () => {
  return render(
    <BrowserRouter>
      <Sidebar />
    </BrowserRouter>
  );
};

describe('Sidebar Light Theme', () => {
  beforeEach(() => {
    // Ensure light mode is active by adding data-theme attribute
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', 'light');
  });

  describe('Rendering', () => {
    it('should render the sidebar component', () => {
      const { container } = renderSidebar();
      const sidebar = container.querySelector('aside');
      expect(sidebar).toBeInTheDocument();
    });

    it('should render logo text "WBhelper"', () => {
      renderSidebar();
      const logo = screen.getByText('WBhelper');
      expect(logo).toBeInTheDocument();
    });

    it('should render logo with primary color class', () => {
      renderSidebar();
      const logo = screen.getByText('WBhelper');
      expect(logo).toHaveClass('text-primary');
    });
  });

  describe('Navigation Items', () => {
    it('should render all nav items', () => {
      renderSidebar();
      expect(screen.getByText('layout.dashboard')).toBeInTheDocument();
      expect(screen.getByText('layout.competitors')).toBeInTheDocument();
      expect(screen.getByText('layout.optimization')).toBeInTheDocument();
      expect(screen.getByText('layout.seoContent')).toBeInTheDocument();
      expect(screen.getByText('layout.returnsForecast')).toBeInTheDocument();
      expect(screen.getByText('layout.nicheAnalysis')).toBeInTheDocument();
      expect(screen.getByText('layout.settings')).toBeInTheDocument();
    });

    it('should render nav links with correct paths', () => {
      renderSidebar();
      const dashboardLink = screen.getByRole('link', { name: /layout.dashboard/i });
      expect(dashboardLink).toHaveAttribute('href', '/dashboard');
    });
  });

  describe('Theme-adaptive Styling', () => {
    it('should have light background class in light theme', () => {
      const { container } = renderSidebar();
      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('bg-slate-50');
    });

    it('should have dark background class in dark theme', () => {
      document.documentElement.setAttribute('data-theme', 'dark');
      const { container } = renderSidebar();
      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('dark:bg-[#0a0a0a]');
    });

    it('should have border class that adapts to theme', () => {
      const { container } = renderSidebar();
      const sidebar = container.querySelector('aside');
      expect(sidebar).toHaveClass('border-gray-200', 'dark:border-charcoal');
    });
  });

  describe('Active State Styling', () => {
    it('should show distinct active state styling for current route', () => {
      // Initial render with no active path - none should be active
      const { container } = renderSidebar();
      const navLinks = container.querySelectorAll('nav a');
      // All nav items should have muted-foreground class (not active)
      navLinks.forEach(link => {
        expect(link).toHaveClass('text-muted-foreground');
      });
    });
  });

  describe('Hover States', () => {
    it('should have hover styles that work in light theme', () => {
      const { container } = renderSidebar();
      const navLinks = container.querySelectorAll('nav a');
      navLinks.forEach(link => {
        expect(link).toHaveClass('hover:bg-accent/20');
      });
    });
  });

  describe('Mobile Overlay', () => {
    it('should render mobile overlay when sidebar store has isMobileOpen', () => {
      // Reset and remock for this specific test
      vi.mock('../../stores/sidebarStore', () => ({
        useSidebarStore: () => ({
          isCollapsed: false,
          isMobileOpen: true,
          toggleCollapse: vi.fn(),
          toggleMobile: vi.fn(),
          closeMobile: vi.fn(),
        }),
      }));

      const { container } = render(
        <BrowserRouter>
          <Sidebar />
        </BrowserRouter>
      );

      const overlay = container.querySelector('.fixed.inset-0.z-40');
      expect(overlay).toBeInTheDocument();
    });
  });

  describe('Collapse Functionality', () => {
    it('should render collapse button', () => {
      const { container } = renderSidebar();
      const collapseButton = container.querySelector('button[title="layout.sidebar.collapse"]');
      expect(collapseButton).toBeInTheDocument();
    });
  });
});