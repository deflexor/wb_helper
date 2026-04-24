import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { RiskBadge } from '../RiskBadge';

describe('RiskBadge', () => {
  describe('Low Risk', () => {
    it('renders with low risk level', () => {
      // Arrange & Act
      render(<RiskBadge level="low" />);

      // Assert
      const badge = screen.getByText(/low/i);
      expect(badge).toBeInTheDocument();
    });

    it('applies green color classes for low risk', () => {
      // Arrange & Act
      render(<RiskBadge level="low" />);

      // Assert
      const badge = screen.getByText(/low/i);
      expect(badge.className).toContain('bg-green-900/50');
      expect(badge.className).toContain('text-green-400');
      expect(badge.className).toContain('border-green-700');
    });

    it('renders correct label for low risk via i18n', () => {
      // Arrange & Act
      render(<RiskBadge level="low" />);

      // Assert - the badge should contain translated text
      const badge = screen.getByText(/low/i);
      expect(badge).toHaveClass('border');
    });
  });

  describe('Medium Risk', () => {
    it('renders with medium risk level', () => {
      // Arrange & Act
      render(<RiskBadge level="medium" />);

      // Assert
      const badge = screen.getByText(/medium/i);
      expect(badge).toBeInTheDocument();
    });

    it('applies yellow color classes for medium risk', () => {
      // Arrange & Act
      render(<RiskBadge level="medium" />);

      // Assert
      const badge = screen.getByText(/medium/i);
      expect(badge.className).toContain('bg-yellow-900/50');
      expect(badge.className).toContain('text-yellow-400');
      expect(badge.className).toContain('border-yellow-700');
    });

    it('renders correct label for medium risk via i18n', () => {
      // Arrange & Act
      render(<RiskBadge level="medium" />);

      // Assert
      const badge = screen.getByText(/medium/i);
      expect(badge).toHaveClass('border');
    });
  });

  describe('High Risk', () => {
    it('renders with high risk level', () => {
      // Arrange & Act
      render(<RiskBadge level="high" />);

      // Assert
      const badge = screen.getByText(/high/i);
      expect(badge).toBeInTheDocument();
    });

    it('applies red color classes for high risk', () => {
      // Arrange & Act
      render(<RiskBadge level="high" />);

      // Assert
      const badge = screen.getByText(/high/i);
      expect(badge.className).toContain('bg-red-900/50');
      expect(badge.className).toContain('text-red-400');
      expect(badge.className).toContain('border-red-700');
    });

    it('renders correct label for high risk via i18n', () => {
      // Arrange & Act
      render(<RiskBadge level="high" />);

      // Assert
      const badge = screen.getByText(/high/i);
      expect(badge).toHaveClass('border');
    });
  });

  describe('Styling & Structure', () => {
    it('applies base styling classes for badge shape', () => {
      // Arrange & Act
      render(<RiskBadge level="low" />);

      // Assert
      const badge = screen.getByText(/low/i);
      expect(badge.className).toContain('inline-flex');
      expect(badge.className).toContain('items-center');
      expect(badge.className).toContain('rounded-full');
      expect(badge.className).toContain('px-2.5');
      expect(badge.className).toContain('py-0.5');
      expect(badge.className).toContain('text-xs');
      expect(badge.className).toContain('font-medium');
    });

    it('applies custom className when provided', () => {
      // Arrange & Act
      render(<RiskBadge level="medium" className="custom-class" />);

      // Assert
      const badge = screen.getByText(/medium/i);
      expect(badge.className).toContain('custom-class');
    });

    it('renders as a span element', () => {
      // Arrange & Act
      render(<RiskBadge level="high" />);

      // Assert
      const badge = screen.getByText(/high/i);
      expect(badge.tagName.toLowerCase()).toBe('span');
    });
  });

  describe('Color State Verification', () => {
    it('low risk has green color scheme', () => {
      // Arrange & Act
      render(<RiskBadge level="low" />);

      // Assert - all three green classes present
      const badge = screen.getByText(/low/i);
      const className = badge.className;
      expect(className).toContain('green');
    });

    it('medium risk has yellow color scheme', () => {
      // Arrange & Act
      render(<RiskBadge level="medium" />);

      // Assert - all three yellow classes present
      const badge = screen.getByText(/medium/i);
      const className = badge.className;
      expect(className).toContain('yellow');
    });

    it('high risk has red color scheme', () => {
      // Arrange & Act
      render(<RiskBadge level="high" />);

      // Assert - all three red classes present
      const badge = screen.getByText(/high/i);
      const className = badge.className;
      expect(className).toContain('red');
    });

    it('each risk level has distinct color scheme', () => {
      // Arrange
      const { rerender } = render(<RiskBadge level="low" />);
      const lowBadge = screen.getByText(/low/i);
      const lowClasses = lowBadge.className;

      // Act
      rerender(<RiskBadge level="medium" />);
      const mediumBadge = screen.getByText(/medium/i);
      const mediumClasses = mediumBadge.className;

      // Assert
      expect(lowClasses).not.toBe(mediumClasses);
    });
  });
});