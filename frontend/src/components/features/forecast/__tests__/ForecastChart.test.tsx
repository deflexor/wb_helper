import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ForecastChart } from '../ForecastChart';

describe('ForecastChart', () => {
  // Helper to create chart data
  const createChartData = (length: number = 5) => {
    return Array.from({ length }, (_, i) => ({
      date: `2024-0${i + 1}-01`,
      forecast: 5 + i * 0.5,
      actual: 4.5 + i * 0.4,
    }));
  };

  describe('Rendering', () => {
    it('renders chart with data', () => {
      // Arrange
      const data = createChartData(5);

      // Act
      render(<ForecastChart data={data} />);

      // Assert - chart container should be present
      const chartContainer = document.querySelector('.recharts-responsive-container');
      expect(chartContainer).toBeInTheDocument();
    });

    it('renders with custom height', () => {
      // Arrange
      const data = createChartData(3);
      const customHeight = 400;

      // Act
      const { container } = render(<ForecastChart data={data} height={customHeight} />);

      // Assert
      const chartWrapper = container.firstChild as HTMLElement;
      expect(chartWrapper.style.height).toBe(`${customHeight}px`);
    });

    it('renders chart without grid when showGrid is false', () => {
      // Arrange
      const data = createChartData(3);

      // Act - just render and ensure no errors
      const { container } = render(<ForecastChart data={data} showGrid={false} />);

      // Assert - chart container should be present
      const chartContainer = container.querySelector('.recharts-responsive-container');
      expect(chartContainer).toBeInTheDocument();
    });

    it('renders chart with grid when showGrid is true (default)', () => {
      // Arrange
      const data = createChartData(3);

      // Act
      const { container } = render(<ForecastChart data={data} showGrid={true} />);

      // Assert - chart container should be present
      const chartContainer = container.querySelector('.recharts-responsive-container');
      expect(chartContainer).toBeInTheDocument();
    });

    it('renders chart with animation by default', () => {
      // Arrange
      const data = createChartData(3);

      // Act
      const { container } = render(<ForecastChart data={data} showAnimation={true} />);

      // Assert - chart container should be present with animation
      const chartContainer = container.querySelector('.recharts-responsive-container');
      expect(chartContainer).toBeInTheDocument();
    });

    it('renders chart without animation when showAnimation is false', () => {
      // Arrange
      const data = createChartData(3);

      // Act
      const { container } = render(<ForecastChart data={data} showAnimation={false} />);

      // Assert - chart should still render container
      const chartContainer = container.querySelector('.recharts-responsive-container');
      expect(chartContainer).toBeInTheDocument();
    });
  });

  describe('Data Processing', () => {
    it('renders with empty data array', () => {
      // Arrange
      const data: { date: string; forecast: number; actual?: number }[] = [];

      // Act
      const { container } = render(<ForecastChart data={data} />);

      // Assert - chart should still render container
      const chartContainer = container.querySelector('.recharts-responsive-container');
      expect(chartContainer).toBeInTheDocument();
    });

    it('renders single data point', () => {
      // Arrange
      const data = [{ date: '2024-01-01', forecast: 5.5, actual: 5.0 }];

      // Act
      render(<ForecastChart data={data} />);

      // Assert
      const chartContainer = document.querySelector('.recharts-responsive-container');
      expect(chartContainer).toBeInTheDocument();
    });

    it('renders with large dataset', () => {
      // Arrange
      const data = createChartData(100);

      // Act
      render(<ForecastChart data={data} />);

      // Assert
      const chartContainer = document.querySelector('.recharts-responsive-container');
      expect(chartContainer).toBeInTheDocument();
    });

    it('uses custom dataKey for forecast line', () => {
      // Arrange
      const data = [
        { date: '2024-01-01', predicted: 10, actual: 8 },
        { date: '2024-01-02', predicted: 12, actual: 10 },
      ];

      // Act
      const { container } = render(<ForecastChart data={data} dataKey="predicted" actualDataKey="actual" />);

      // Assert - chart should render with custom data keys
      const chartContainer = container.querySelector('.recharts-responsive-container');
      expect(chartContainer).toBeInTheDocument();
    });

    it('renders without actual data line when actualDataKey is omitted', () => {
      // Arrange
      const data = [
        { date: '2024-01-01', forecast: 10 },
        { date: '2024-01-02', forecast: 12 },
      ];

      // Act
      const { container } = render(<ForecastChart data={data} />);

      // Assert - chart should still render the forecast line
      const chartContainer = container.querySelector('.recharts-responsive-container');
      expect(chartContainer).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('renders within a full-width container', () => {
      // Arrange
      const data = createChartData(3);

      // Act
      const { container } = render(<ForecastChart data={data} />);

      // Assert
      const chartWrapper = container.firstChild as HTMLElement;
      expect(chartWrapper.classList.contains('w-full')).toBe(true);
    });
  });
});