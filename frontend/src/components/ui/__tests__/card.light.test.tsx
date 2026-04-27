import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Card } from '../card';
import '@testing-library/jest-dom';

describe('Card - Light Theme', () => {
  describe('Light theme styling', () => {
    it('should have shadow in light theme', () => {
      // Light theme: Card should have shadow-sm
      const { container } = render(<Card data-testid="card">Content</Card>);
      const card = container.firstChild as HTMLElement;
      
      // Card should have shadow utility class (shadow-sm)
      expect(card).toHaveClass('shadow-sm');
      // Card should NOT have dark:shadow-none class directly (it uses dark: modifier)
      expect(card.className).toContain('shadow-sm');
    });

    it('should have minimal border (transparent) in light theme', () => {
      const { container } = render(<Card data-testid="card">Content</Card>);
      const card = container.firstChild as HTMLElement;
      
      // Light theme: border-transparent
      expect(card).toHaveClass('border-transparent');
    });

    it('should have no dark-specific border styling in light theme', () => {
      const { container } = render(<Card data-testid="card">Content</Card>);
      const card = container.firstChild as HTMLElement;
      
      // The dark:border-border should NOT be active in light mode
      // We can verify by checking that the element doesn't have the dark mode active
      // In light mode, only border-transparent is active
      expect(card.className).toContain('border-transparent');
      expect(card.className).not.toMatch(/dark:border-\[[^\]]+\]/);
    });
  });

  describe('Dark theme styling', () => {
    it('should have border in dark theme', () => {
      // Simulate dark mode by adding dark class to container
      const { container } = render(
        <div className="dark">
          <Card data-testid="card">Content</Card>
        </div>
      );
      const card = container.querySelector('[data-testid="card"]') as HTMLElement;
      
      // In dark mode, dark:border-border should be active
      expect(card).toHaveClass('dark:border-border');
    });

    it('should have no shadow in dark theme', () => {
      const { container } = render(
        <div className="dark">
          <Card data-testid="card">Content</Card>
        </div>
      );
      const card = container.querySelector('[data-testid="card"]') as HTMLElement;
      
      // In dark mode, dark:shadow-none should remove shadow
      expect(card).toHaveClass('dark:shadow-none');
    });
  });

  describe('Content rendering', () => {
    it('should render children content', () => {
      const { getByText } = render(<Card>Test Content</Card>);
      expect(getByText('Test Content')).toBeInTheDocument();
    });

    it('should have correct base classes regardless of theme', () => {
      const { container } = render(<Card>Content</Card>);
      const card = container.firstChild as HTMLElement;
      
      // Base classes that should always be present
      expect(card).toHaveClass('rounded-lg');
      expect(card).toHaveClass('bg-card');
      expect(card).toHaveClass('text-card-foreground');
      expect(card).toHaveClass('transition-shadow');
    });

    it('should pass through additional className', () => {
      const { container } = render(<Card className="custom-class">Content</Card>);
      const card = container.firstChild as HTMLElement;
      
      expect(card).toHaveClass('custom-class');
    });
  });

  describe('Accessibility', () => {
    it('should render as a div element', () => {
      const { container } = render(<Card>Content</Card>);
      expect(container.firstChild?.nodeName).toBe('DIV');
    });

    it('should accept and pass through standard HTML attributes', () => {
      const { getByTestId } = render(
        <Card data-testid="accessible-card" role="article" aria-label="Test card">
          Content
        </Card>
      );
      
      const card = getByTestId('accessible-card');
      expect(card).toHaveAttribute('role', 'article');
      expect(card).toHaveAttribute('aria-label', 'Test card');
    });
  });
});
