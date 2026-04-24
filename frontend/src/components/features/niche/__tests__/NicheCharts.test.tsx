import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from './setup';
import { NicheCharts } from '../NicheCharts';
import type { NicheData } from '../NicheCharts';
import '@testing-library/jest-dom';
import { screen } from '@testing-library/react';

// Recharts uses canvas/SVG which requires special handling in tests
// We mock Recharts components to test the wrapper behavior

vi.mock('recharts', () => ({
  ScatterChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scatter-chart" className="scatter-chart-mock">
      {children}
    </div>
  ),
  Scatter: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="scatter" className="scatter-mock">
      {children}
    </div>
  ),
  BarChart: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar-chart" className="bar-chart-mock">
      {children}
    </div>
  ),
  Bar: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="bar" className="bar-mock">
      {children}
    </div>
  ),
  XAxis: () => <div data-testid="x-axis" className="x-axis-mock" />,
  YAxis: () => <div data-testid="y-axis" className="y-axis-mock" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" className="cartesian-grid-mock" />,
  Tooltip: () => <div data-testid="tooltip" className="tooltip-mock" />,
  Legend: () => <div data-testid="legend" className="legend-mock" />,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="responsive-container" className="responsive-container-mock">
      {children}
    </div>
  ),
  Cell: () => <div data-testid="cell" className="cell-mock" />,
}));

// =============================================================================
// Test Data
// =============================================================================

const mockNicheData: NicheData[] = [
  {
    id: '1',
    product: 'Беспроводные наушники',
    category: 'Электроника',
    demandScore: 85,
    competitionLevel: 'high',
    trend: 'up',
  },
  {
    id: '2',
    product: 'USB-C кабель 2м',
    category: 'Аксессуары',
    demandScore: 72,
    competitionLevel: 'medium',
    trend: 'stable',
  },
  {
    id: '3',
    product: 'Защитный чехол для телефона',
    category: 'Аксессуары',
    demandScore: 68,
    competitionLevel: 'high',
    trend: 'down',
  },
  {
    id: '4',
    product: 'Автомобильный держатель',
    category: 'Аксессуары',
    demandScore: 55,
    competitionLevel: 'low',
    trend: 'up',
  },
  {
    id: '5',
    product: 'Фитнес-браслет',
    category: 'Электроника',
    demandScore: 62,
    competitionLevel: 'medium',
    trend: 'stable',
  },
];

// =============================================================================
// Tests
// =============================================================================

describe('NicheCharts', () => {
  describe('rendering', () => {
    it('should render both chart cards', () => {
      // Arrange
      renderWithProviders(<NicheCharts data={mockNicheData} />);

      // Assert - both chart titles are rendered
      expect(screen.getByText('Demand vs Competition')).toBeInTheDocument();
      expect(screen.getByText('Avg. Demand by Category')).toBeInTheDocument();
    });

    it('should render scatter chart container', () => {
      // Arrange
      renderWithProviders(<NicheCharts data={mockNicheData} />);

      // Assert - scatter chart is rendered
      expect(screen.getByTestId('scatter-chart')).toBeInTheDocument();
    });

    it('should render bar chart container', () => {
      // Arrange
      renderWithProviders(<NicheCharts data={mockNicheData} />);

      // Assert - bar chart is rendered
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should render loading skeleton when isLoading is true', () => {
      // Arrange
      renderWithProviders(<NicheCharts data={[]} isLoading={true} />);

      // Assert - skeleton loaders are displayed
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should not render charts when loading', () => {
      // Arrange
      renderWithProviders(<NicheCharts data={[]} isLoading={true} />);

      // Assert - charts not rendered during loading
      expect(screen.queryByTestId('scatter-chart')).not.toBeInTheDocument();
      expect(screen.queryByTestId('bar-chart')).not.toBeInTheDocument();
    });

    it('should render responsive containers for both charts', () => {
      // Arrange
      renderWithProviders(<NicheCharts data={mockNicheData} />);

      // Assert - responsive containers are present
      const containers = screen.getAllByTestId('responsive-container');
      expect(containers).toHaveLength(2);
    });
  });

  describe('data transformation', () => {
    it('should handle empty data array', () => {
      // Arrange
      renderWithProviders(<NicheCharts data={[]} />);

      // Assert - charts still render with empty data
      expect(screen.getByText('Demand vs Competition')).toBeInTheDocument();
      expect(screen.getByText('Avg. Demand by Category')).toBeInTheDocument();
    });

    it('should handle single data point', () => {
      // Arrange
      const singleData: NicheData[] = [mockNicheData[0]];
      renderWithProviders(<NicheCharts data={singleData} />);

      // Assert - chart still renders
      expect(screen.getByTestId('scatter-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should handle data with different categories', () => {
      // Arrange
      renderWithProviders(<NicheCharts data={mockNicheData} />);

      // Assert - both categories are represented in charts
      expect(screen.getByTestId('scatter-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });

    it('should handle data with all competition levels', () => {
      // Arrange - data already has low, medium, high
      renderWithProviders(<NicheCharts data={mockNicheData} />);

      // Assert - chart renders with all competition levels
      expect(screen.getByTestId('scatter-chart')).toBeInTheDocument();
      expect(screen.getByTestId('scatter')).toBeInTheDocument();
    });
  });

  describe('card structure', () => {
    it('should render chart cards with proper styling', () => {
      // Arrange
      renderWithProviders(<NicheCharts data={mockNicheData} />);

      // Assert - chart cards are in the document (card components)
      expect(screen.getByText('Demand vs Competition')).toBeInTheDocument();
      expect(screen.getByText('Avg. Demand by Category')).toBeInTheDocument();
    });

    it('should render two column grid layout', () => {
      // Arrange
      const { container } = renderWithProviders(<NicheCharts data={mockNicheData} />);

      // Assert - grid layout contains both charts
      const gridChildren = container.firstChild?.childNodes;
      expect(gridChildren?.length).toBeGreaterThanOrEqual(2);
    });
  });

  describe('tooltip rendering', () => {
    it('should render tooltip component', () => {
      // Arrange
      renderWithProviders(<NicheCharts data={mockNicheData} />);

      // Assert - tooltip is rendered (one per chart)
      const tooltips = screen.getAllByTestId('tooltip');
      expect(tooltips.length).toBeGreaterThan(0);
    });

    it('should render legend component', () => {
      // Arrange
      renderWithProviders(<NicheCharts data={mockNicheData} />);

      // Assert - legend is rendered
      const legends = screen.getAllByTestId('legend');
      expect(legends.length).toBeGreaterThan(0);
    });
  });

  describe('axis rendering', () => {
    it('should render X and Y axes for scatter chart', () => {
      // Arrange
      renderWithProviders(<NicheCharts data={mockNicheData} />);

      // Assert - axes are rendered (using getAllByTestId since each chart has its own axes)
      const xAxes = screen.getAllByTestId('x-axis');
      const yAxes = screen.getAllByTestId('y-axis');
      expect(xAxes.length).toBeGreaterThan(0);
      expect(yAxes.length).toBeGreaterThan(0);
    });

    it('should render Cartesian grid', () => {
      // Arrange
      renderWithProviders(<NicheCharts data={mockNicheData} />);

      // Assert - grid is rendered
      const grids = screen.getAllByTestId('cartesian-grid');
      expect(grids.length).toBeGreaterThan(0);
    });
  });

  describe('cell rendering', () => {
    it('should render cells for scatter chart points', () => {
      // Arrange
      renderWithProviders(<NicheCharts data={mockNicheData} />);

      // Assert - cells are rendered (one per data point per chart)
      const cells = screen.getAllByTestId('cell');
      expect(cells.length).toBeGreaterThan(0);
    });
  });
});