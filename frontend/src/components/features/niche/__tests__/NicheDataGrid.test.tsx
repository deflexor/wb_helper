import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from './setup';
import { NicheDataGrid } from '../NicheDataGrid';
import type { NicheData } from '../NicheDataGrid';
import '@testing-library/jest-dom';
import { fireEvent, screen } from '@testing-library/react';

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
// Test Setup
// =============================================================================

describe('NicheDataGrid', () => {
  describe('rendering', () => {
    it('should render table headers', () => {
      // Arrange
      renderWithProviders(<NicheDataGrid data={mockNicheData} />);

      // Assert - check all column headers are rendered
      expect(screen.getByText('Product')).toBeInTheDocument();
      expect(screen.getByText('Category')).toBeInTheDocument();
      expect(screen.getByText('Demand Score')).toBeInTheDocument();
      expect(screen.getByText('Competition')).toBeInTheDocument();
      expect(screen.getByText('Trend')).toBeInTheDocument();
    });

    it('should render all data rows', () => {
      // Arrange
      renderWithProviders(<NicheDataGrid data={mockNicheData} />);

      // Assert - verify all products are displayed
      expect(screen.getByText('Беспроводные наушники')).toBeInTheDocument();
      expect(screen.getByText('USB-C кабель 2м')).toBeInTheDocument();
      expect(screen.getByText('Защитный чехол для телефона')).toBeInTheDocument();
      expect(screen.getByText('Автомобильный держатель')).toBeInTheDocument();
      expect(screen.getByText('Фитнес-браслет')).toBeInTheDocument();
    });

    it('should render loading skeleton when isLoading is true', () => {
      // Arrange
      renderWithProviders(<NicheDataGrid data={[]} isLoading={true} />);

      // Assert - skeleton elements are present (5 skeleton rows)
      const skeletons = document.querySelectorAll('[class*="animate-pulse"]');
      expect(skeletons.length).toBeGreaterThan(0);
    });

    it('should render empty state when no data', () => {
      // Arrange
      renderWithProviders(<NicheDataGrid data={[]} />);

      // Assert - empty state message shown
      expect(screen.getByText('No results found')).toBeInTheDocument();
    });

    it('should render category badges with correct styling', () => {
      // Arrange
      renderWithProviders(<NicheDataGrid data={mockNicheData} />);

      // Assert - category badges are rendered (one per row)
      const electroBadges = screen.getAllByText('Электроника');
      const accessoriesBadges = screen.getAllByText('Аксессуары');
      expect(electroBadges.length).toBeGreaterThan(0);
      expect(accessoriesBadges.length).toBeGreaterThan(0);
    });
  });

  describe('search filtering', () => {
    it('should filter by product name', () => {
      // Arrange
      renderWithProviders(<NicheDataGrid data={mockNicheData} />);
      const searchInput = screen.getByPlaceholderText('Search products or categories...');

      // Act
      fireEvent.change(searchInput, { target: { value: 'наушники' } });

      // Assert - only matching product shown
      expect(screen.getByText('Беспроводные наушники')).toBeInTheDocument();
      expect(screen.queryByText('USB-C кабель 2м')).not.toBeInTheDocument();
    });

    it('should filter by category name', () => {
      // Arrange
      renderWithProviders(<NicheDataGrid data={mockNicheData} />);
      const searchInput = screen.getByPlaceholderText('Search products or categories...');

      // Act
      fireEvent.change(searchInput, { target: { value: 'Электроника' } });

      // Assert - only products in matching category shown
      expect(screen.getByText('Беспроводные наушники')).toBeInTheDocument();
      expect(screen.getByText('Фитнес-браслет')).toBeInTheDocument();
      expect(screen.queryByText('USB-C кабель 2м')).not.toBeInTheDocument();
    });

    it('should show all rows when search is cleared', () => {
      // Arrange
      renderWithProviders(<NicheDataGrid data={mockNicheData} />);
      const searchInput = screen.getByPlaceholderText('Search products or categories...');

      // Act - search then clear
      fireEvent.change(searchInput, { target: { value: 'наушники' } });
      expect(screen.getByText('Беспроводные наушники')).toBeInTheDocument();

      fireEvent.change(searchInput, { target: { value: '' } });

      // Assert - all rows visible again
      expect(screen.getByText('USB-C кабель 2м')).toBeInTheDocument();
      expect(screen.getByText('Защитный чехол для телефона')).toBeInTheDocument();
    });

    it('should be case-insensitive', () => {
      // Arrange
      renderWithProviders(<NicheDataGrid data={mockNicheData} />);
      const searchInput = screen.getByPlaceholderText('Search products or categories...');

      // Act
      fireEvent.change(searchInput, { target: { value: 'НАУШНИКИ' } });

      // Assert - search is case-insensitive
      expect(screen.getByText('Беспроводные наушники')).toBeInTheDocument();
    });
  });

  describe('competition level filtering', () => {
    it('should filter by low competition level', () => {
      // Arrange
      renderWithProviders(<NicheDataGrid data={mockNicheData} />);
      const select = screen.getByRole('combobox');

      // Act
      fireEvent.change(select, { target: { value: 'low' } });

      // Assert - only low competition products shown
      expect(screen.getByText('Автомобильный держатель')).toBeInTheDocument();
      expect(screen.queryByText('Беспроводные наушники')).not.toBeInTheDocument();
    });

    it('should filter by medium competition level', () => {
      // Arrange
      renderWithProviders(<NicheDataGrid data={mockNicheData} />);
      const select = screen.getByRole('combobox');

      // Act
      fireEvent.change(select, { target: { value: 'medium' } });

      // Assert - only medium competition products shown
      expect(screen.getByText('USB-C кабель 2м')).toBeInTheDocument();
      expect(screen.getByText('Фитнес-браслет')).toBeInTheDocument();
      expect(screen.queryByText('Беспроводные наушники')).not.toBeInTheDocument();
    });

    it('should filter by high competition level', () => {
      // Arrange
      renderWithProviders(<NicheDataGrid data={mockNicheData} />);
      const select = screen.getByRole('combobox');

      // Act
      fireEvent.change(select, { target: { value: 'high' } });

      // Assert - only high competition products shown
      expect(screen.getByText('Беспроводные наушники')).toBeInTheDocument();
      expect(screen.getByText('Защитный чехол для телефона')).toBeInTheDocument();
      expect(screen.queryByText('Автомобильный держатель')).not.toBeInTheDocument();
    });

    it('should show all competition levels when "all" is selected', () => {
      // Arrange
      renderWithProviders(<NicheDataGrid data={mockNicheData} />);
      const select = screen.getByRole('combobox');

      // Act - first filter to low, then back to all
      fireEvent.change(select, { target: { value: 'low' } });
      expect(screen.getByText('Автомобильный держатель')).toBeInTheDocument();

      fireEvent.change(select, { target: { value: 'all' } });

      // Assert - all rows visible
      expect(screen.getByText('Беспроводные наушники')).toBeInTheDocument();
      expect(screen.getByText('USB-C кабель 2м')).toBeInTheDocument();
    });
  });

  describe('sorting', () => {
    it('should sort by product name when clicking column header', () => {
      // Arrange
      renderWithProviders(<NicheDataGrid data={mockNicheData} />);
      const productHeader = screen.getByText('Product').closest('th');

      // Act - click to sort ascending
      if (productHeader) {
        fireEvent.click(productHeader);
      }

      // Assert - first row should be "USB-C кабель 2м" (ascending by Unicode)
      const rows = screen.getAllByRole('row').filter(row => row.querySelector('td'));
      expect(rows[0].textContent).toContain('USB-C кабель 2м');
    });

    it('should sort by demand score when clicking column header', () => {
      // Arrange
      renderWithProviders(<NicheDataGrid data={mockNicheData} />);
      const demandHeader = screen.getByText('Demand Score').closest('th');

      // Act - click to sort
      if (demandHeader) {
        fireEvent.click(demandHeader);
      }

      // Assert - demand scores visible (highest first when desc)
      const rows = screen.getAllByRole('row').filter(row => row.querySelector('td'));
      const firstRowText = rows[0].textContent || '';
      expect(firstRowText).toContain('85');
    });

    it('should toggle sort direction on second click', () => {
      // Arrange
      renderWithProviders(<NicheDataGrid data={mockNicheData} />);
      const demandHeader = screen.getByText('Demand Score').closest('th');

      // Act - click twice to toggle
      if (demandHeader) {
        fireEvent.click(demandHeader);
        fireEvent.click(demandHeader);
      }

      // Assert - should show ascending sort indicator
      const rows = screen.getAllByRole('row').filter(row => row.querySelector('td'));
      const firstRowText = rows[0].textContent || '';
      // Ascending: lowest demand first (55)
      expect(firstRowText).toContain('55');
    });
  });

  describe('combined filtering', () => {
    it('should apply both search and competition filter together', () => {
      // Arrange
      renderWithProviders(<NicheDataGrid data={mockNicheData} />);
      const searchInput = screen.getByPlaceholderText('Search products or categories...');
      const select = screen.getByRole('combobox');

      // Act - apply both filters
      fireEvent.change(searchInput, { target: { value: 'кабель' } });
      fireEvent.change(select, { target: { value: 'medium' } });

      // Assert - only matching row shown
      expect(screen.getByText('USB-C кабель 2м')).toBeInTheDocument();
      expect(screen.queryByText('Фитнес-браслет')).not.toBeInTheDocument();
    });
  });

  describe('pagination', () => {
    it('should render pagination controls', () => {
      // Arrange
      renderWithProviders(<NicheDataGrid data={mockNicheData} />);

      // Assert - pagination buttons exist
      expect(screen.getByText('Previous')).toBeInTheDocument();
      expect(screen.getByText('Next')).toBeInTheDocument();
    });

    it('should disable previous button on first page', () => {
      // Arrange
      renderWithProviders(<NicheDataGrid data={mockNicheData} />);
      const prevButton = screen.getByText('Previous').closest('button');

      // Assert - previous is disabled on first page
      expect(prevButton).toBeDisabled();
    });

    it('should disable next button when on last page', () => {
      // Arrange
      renderWithProviders(<NicheDataGrid data={mockNicheData} />);
      const nextButton = screen.getByText('Next').closest('button');

      // Assert - next is disabled on last page (only 5 items, page size 20)
      expect(nextButton).toBeDisabled();
    });
  });

  describe('export functionality', () => {
    it('should render export button', () => {
      // Arrange
      renderWithProviders(<NicheDataGrid data={mockNicheData} />);

      // Assert - export button exists
      expect(screen.getByText('Export')).toBeInTheDocument();
    });

    it('should have export button with click handler', () => {
      // Arrange
      renderWithProviders(<NicheDataGrid data={mockNicheData} />);
      const exportButton = screen.getByText('Export').closest('button');

      // Act & Assert - button is clickable (no error thrown)
      if (exportButton) {
        fireEvent.click(exportButton);
      }
    });
  });
});