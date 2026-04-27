import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Button } from '@/components/ui/button';
import '@testing-library/jest-dom';

describe('Button Light Theme', () => {
  const whiteBackgroundStyle = 'background: #ffffff; padding: 20px;';

  describe('Primary (default) variant on white background', () => {
    it('should be visible with neon volt color', () => {
      render(
        <div style={{ background: '#ffffff', padding: '20px' }}>
          <Button variant="default">Primary Button</Button>
        </div>
      );
      const button = screen.getByRole('button', { name: /primary button/i });
      // Primary uses --primary (neon volt #faff69) with dark text - HIGH CONTRAST on white
      expect(button).toBeVisible();
      expect(button).toHaveClass('bg-primary');
    });

    it('should have dark text for contrast on neon volt', () => {
      render(
        <div style={{ background: '#ffffff', padding: '20px' }}>
          <Button variant="default">Primary Button</Button>
        </div>
      );
      const button = screen.getByRole('button', { name: /primary button/i });
      expect(button).toHaveClass('text-primary-foreground');
    });
  });

  describe('Secondary variant on white background', () => {
    it('should be visible with forest green color', () => {
      render(
        <div style={{ background: '#ffffff', padding: '20px' }}>
          <Button variant="secondary">Secondary Button</Button>
        </div>
      );
      const button = screen.getByRole('button', { name: /secondary button/i });
      // Secondary uses --secondary (forest green #166534) - visible on white
      expect(button).toBeVisible();
      expect(button).toHaveClass('bg-secondary');
    });
  });

  describe('Ghost variant on white background', () => {
    it('should be visible with subtle hover state using muted gray', () => {
      render(
        <div style={{ background: '#ffffff', padding: '20px' }}>
          <Button variant="ghost">Ghost Button</Button>
        </div>
      );
      const button = screen.getByRole('button', { name: /ghost button/i });
      // Ghost uses hover:bg-muted - on light theme muted is subtle gray #f4f4f5
      // This provides subtle interaction feedback on white background
      expect(button).toBeVisible();
      expect(button).toHaveClass('hover:bg-muted');
    });
  });

  describe('Outline variant on white background', () => {
    it('should have visible borders', () => {
      render(
        <div style={{ background: '#ffffff', padding: '20px' }}>
          <Button variant="outline">Outline Button</Button>
        </div>
      );
      const button = screen.getByRole('button', { name: /outline button/i });
      // Outline uses border-input (--input: 0 0% 90%) and bg-background (white)
      // Border should be visible light gray on white
      expect(button).toBeVisible();
      expect(button).toHaveClass('border');
      expect(button).toHaveClass('border-input');
      expect(button).toHaveClass('bg-background');
    });
  });

  describe('Destructive variant on white background', () => {
    it('should be visible with red color', () => {
      render(
        <div style={{ background: '#ffffff', padding: '20px' }}>
          <Button variant="destructive">Destructive Button</Button>
        </div>
      );
      const button = screen.getByRole('button', { name: /destructive button/i });
      expect(button).toBeVisible();
      expect(button).toHaveClass('bg-destructive');
    });
  });

  describe('Link variant on white background', () => {
    it('should be visible as link', () => {
      render(
        <div style={{ background: '#ffffff', padding: '20px' }}>
          <Button variant="link">Link Button</Button>
        </div>
      );
      const button = screen.getByRole('button', { name: /link button/i });
      expect(button).toBeVisible();
      expect(button).toHaveClass('text-primary');
    });
  });
});
