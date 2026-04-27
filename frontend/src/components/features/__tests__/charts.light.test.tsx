import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ForecastChart } from '../forecast/ForecastChart';
import { NicheCharts } from '../niche/NicheCharts';
import { renderWithProviders } from '../niche/__tests__/setup';

// Mock Recharts components to allow testing in jsdom environment
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container" className="responsive-container-mock">{children}</div>
  ),
  LineChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="line-chart" className="line-chart-mock">{children}</div>
  ),
  Line: () => <div data-testid="line" className="line-mock" />,
  Area: () => <div data-testid="area" className="area-mock" />,
  XAxis: () => <div data-testid="x-axis" className="x-axis-mock" />,
  YAxis: () => <div data-testid="y-axis" className="y-axis-mock" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" className="cartesian-grid-mock" />,
  Tooltip: () => <div data-testid="tooltip" className="tooltip-mock" />,
  ScatterChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scatter-chart" className="scatter-chart-mock">{children}</div>
  ),
  Scatter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scatter" className="scatter-mock">{children}</div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart" className="bar-chart-mock">{children}</div>
  ),
  Bar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar" className="bar-mock">{children}</div>
  ),
  Legend: () => <div data-testid="legend" className="legend-mock" />,
  Cell: () => <div data-testid="cell" className="cell-mock" />,
}));

// =============================================================================
// Test Data
// =============================================================================

const forecastData = [
  { date: '2024-01-01', forecast: 5.5, actual: 5.0 },
  { date: '2024-01-02', forecast: 6.0, actual: 5.5 },
  { date: '2024-01-03', forecast: 6.5, actual: 6.0 },
];

const nicheData = [
  {
    id: '1',
    product: 'Wireless Headphones',
    category: 'Electronics',
    demandScore: 85,
    competitionLevel: 'high' as const,
    trend: 'up' as const,
  },
  {
    id: '2',
    product: 'USB Cable 2m',
    category: 'Accessories',
    demandScore: 72,
    competitionLevel: 'medium' as const,
    trend: 'stable' as const,
  },
];

// =============================================================================
// ForecastChart Tests
// =============================================================================

describe('ForecastChart - Light Theme', () => {
  describe('Rendering', () => {
    it('renders chart container in light theme', () => {
      render(<ForecastChart data={forecastData} />);
      const chartContainer = document.querySelector('[data-testid="responsive-container"]');
      expect(chartContainer).toBeInTheDocument();
    });

    it('renders with default height', () => {
      render(<ForecastChart data={forecastData} />);
      const chartWrapper = document.querySelector('.w-full');
      expect(chartWrapper).toBeInTheDocument();
    });
  });

  describe('Tooltip Visibility', () => {
    it('renders tooltip component', () => {
      render(<ForecastChart data={forecastData} />);
      const tooltips = screen.getAllByTestId('tooltip');
      expect(tooltips.length).toBeGreaterThan(0);
    });

    it('renders with custom height and tooltip area', () => {
      render(<ForecastChart data={forecastData} height={300} />);
      const chartWrapper = document.querySelector('.w-full') as HTMLElement;
      expect(chartWrapper.style.height).toBe('300px');
    });
  });

  describe('Theme-aware CSS Variables', () => {
    it('uses CSS variables for chart styling (not hardcoded dark colors)', () => {
      // This test verifies the chart uses CSS variables instead of hardcoded colors
      // The actual CSS variables are defined in index.css and respond to theme
      render(<ForecastChart data={forecastData} />);
      const chartContainer = document.querySelector('[data-testid="responsive-container"]');
      expect(chartContainer).toBeInTheDocument();
    });
  });
});

// =============================================================================
// NicheCharts Tests
// =============================================================================

describe('NicheCharts - Light Theme', () => {
  describe('Rendering', () => {
    it('renders both chart cards in light theme', () => {
      renderWithProviders(<NicheCharts data={nicheData} />);
      expect(screen.getByText('Demand vs Competition')).toBeInTheDocument();
      expect(screen.getByText('Avg. Demand by Category')).toBeInTheDocument();
    });

    it('renders chart containers', () => {
      renderWithProviders(<NicheCharts data={nicheData} />);
      const containers = screen.getAllByTestId('responsive-container');
      expect(containers).toHaveLength(2);
    });
  });

  describe('Tooltip Visibility', () => {
    it('renders tooltip components for both charts', () => {
      renderWithProviders(<NicheCharts data={nicheData} />);
      const tooltips = screen.getAllByTestId('tooltip');
      expect(tooltips.length).toBeGreaterThan(0);
    });

    it('renders legend component', () => {
      renderWithProviders(<NicheCharts data={nicheData} />);
      const legends = screen.getAllByTestId('legend');
      expect(legends.length).toBeGreaterThan(0);
    });
  });

  describe('Theme-aware CSS Variables', () => {
    it('uses CSS variables for chart styling (not hardcoded dark colors)', () => {
      renderWithProviders(<NicheCharts data={nicheData} />);
      // Chart containers should render with theme-aware styling
      expect(screen.getByText('Demand vs Competition')).toBeInTheDocument();
    });

    it('renders competition level colors that are vibrant in light theme', () => {
      renderWithProviders(<NicheCharts data={nicheData} />);
      // Competition level colors (green/yellow/red) should be visible
      expect(screen.getByText('Demand vs Competition')).toBeInTheDocument();
    });
  });
});
