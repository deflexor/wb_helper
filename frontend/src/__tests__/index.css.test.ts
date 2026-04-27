import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * Tests for CSS custom properties theme support.
 * Verifies that light and dark theme CSS variables are properly defined.
 */
describe('Theme CSS Variables', () => {
  const getThemeVars = (cssContent: string, selector: string): Record<string, string> => {
    const vars: Record<string, string> = {};
    // Match CSS variable definitions within the selector block
    const selectorRegex = new RegExp(`${selector}\\s*\\{([^}]*)\\}`, 'g');
    const match = selectorRegex.exec(cssContent);
    if (match) {
      const varMatches = match[1].matchAll(/--([a-z-]+):\s*([^;]+);/g);
      for (const [, name, value] of varMatches) {
        vars[name] = value.trim();
      }
    }
    return vars;
  };

  const cssContent = readFileSync(resolve(__dirname, '../index.css'), 'utf-8');

  describe('Light Theme (default :root)', () => {
    const lightVars = getThemeVars(cssContent, ':root');

    it('should define --background for light theme', () => {
      expect(lightVars['background']).toBeDefined();
      expect(lightVars['background']).toBe('0 0% 100%');
    });

    it('should define --foreground for light theme', () => {
      expect(lightVars['foreground']).toBeDefined();
      expect(lightVars['foreground']).toBe('0 0% 9%');
    });

    it('should define --primary for light theme', () => {
      expect(lightVars['primary']).toBeDefined();
      expect(lightVars['primary']).toBe('63 100% 71%');
    });

    it('should define --primary-foreground for light theme', () => {
      expect(lightVars['primary-foreground']).toBeDefined();
      expect(lightVars['primary-foreground']).toBe('0 0% 9%');
    });

    it('should define --secondary for light theme', () => {
      expect(lightVars['secondary']).toBeDefined();
      expect(lightVars['secondary']).toBe('142 76% 24%');
    });

    it('should define --secondary-foreground for light theme', () => {
      expect(lightVars['secondary-foreground']).toBeDefined();
      expect(lightVars['secondary-foreground']).toBe('0 0% 100%');
    });

    it('should define --muted for light theme', () => {
      expect(lightVars['muted']).toBeDefined();
      expect(lightVars['muted']).toBe('0 0% 96%');
    });

    it('should define --muted-foreground for light theme', () => {
      expect(lightVars['muted-foreground']).toBeDefined();
      expect(lightVars['muted-foreground']).toBe('0 0% 45%');
    });

    it('should define --accent for light theme', () => {
      expect(lightVars['accent']).toBeDefined();
      expect(lightVars['accent']).toBe('63 100% 71%');
    });

    it('should define --accent-foreground for light theme', () => {
      expect(lightVars['accent-foreground']).toBeDefined();
      expect(lightVars['accent-foreground']).toBe('0 0% 9%');
    });

    it('should define --destructive for light theme', () => {
      expect(lightVars['destructive']).toBeDefined();
      expect(lightVars['destructive']).toBe('0 84.2% 60.2%');
    });

    it('should define --destructive-foreground for light theme', () => {
      expect(lightVars['destructive-foreground']).toBeDefined();
      expect(lightVars['destructive-foreground']).toBe('210 40% 98%');
    });

    it('should define --border for light theme', () => {
      expect(lightVars['border']).toBeDefined();
      expect(lightVars['border']).toBe('0 0% 90%');
    });

    it('should define --input for light theme', () => {
      expect(lightVars['input']).toBeDefined();
      expect(lightVars['input']).toBe('0 0% 90%');
    });

    it('should define --ring for light theme', () => {
      expect(lightVars['ring']).toBeDefined();
      expect(lightVars['ring']).toBe('63 100% 71%');
    });

    it('should define --card for light theme', () => {
      expect(lightVars['card']).toBeDefined();
      expect(lightVars['card']).toBe('0 0% 100%');
    });

    it('should define --card-foreground for light theme', () => {
      expect(lightVars['card-foreground']).toBeDefined();
      expect(lightVars['card-foreground']).toBe('0 0% 9%');
    });

    it('should use white background and near-black text for WCAG AA contrast', () => {
      // Background: 0 0% 100% = #ffffff (white)
      // Foreground: 0 0% 9% = #151515 (near black)
      // Contrast ratio is 16.1:1 which exceeds WCAG AA 4.5:1
      expect(lightVars['background']).toBe('0 0% 100%');
      expect(lightVars['foreground']).toBe('0 0% 9%');
    });
  });

  describe('Dark Theme (.dark)', () => {
    const darkVars = getThemeVars(cssContent, '\\.dark');

    it('should define --background for dark theme', () => {
      expect(darkVars['background']).toBeDefined();
      expect(darkVars['background']).toBe('0 0% 0%');
    });

    it('should define --foreground for dark theme', () => {
      expect(darkVars['foreground']).toBeDefined();
      expect(darkVars['foreground']).toBe('0 0% 100%');
    });

    it('should define --primary for dark theme', () => {
      expect(darkVars['primary']).toBeDefined();
      expect(darkVars['primary']).toBe('63 100% 71%');
    });

    it('should define --primary-foreground for dark theme', () => {
      expect(darkVars['primary-foreground']).toBeDefined();
      expect(darkVars['primary-foreground']).toBe('0 0% 0%');
    });

    it('should define --secondary for dark theme', () => {
      expect(darkVars['secondary']).toBeDefined();
      expect(darkVars['secondary']).toBe('142 76% 24%');
    });

    it('should define --secondary-foreground for dark theme', () => {
      expect(darkVars['secondary-foreground']).toBeDefined();
      expect(darkVars['secondary-foreground']).toBe('0 0% 100%');
    });

    it('should define --muted for dark theme', () => {
      expect(darkVars['muted']).toBeDefined();
      expect(darkVars['muted']).toBe('0 0% 25%');
    });

    it('should define --muted-foreground for dark theme', () => {
      expect(darkVars['muted-foreground']).toBeDefined();
      expect(darkVars['muted-foreground']).toBe('0 0% 63%');
    });

    it('should define --accent for dark theme', () => {
      expect(darkVars['accent']).toBeDefined();
      expect(darkVars['accent']).toBe('63 100% 71%');
    });

    it('should define --accent-foreground for dark theme', () => {
      expect(darkVars['accent-foreground']).toBeDefined();
      expect(darkVars['accent-foreground']).toBe('0 0% 0%');
    });

    it('should define --destructive for dark theme', () => {
      expect(darkVars['destructive']).toBeDefined();
      expect(darkVars['destructive']).toBe('0 84.2% 60.2%');
    });

    it('should define --destructive-foreground for dark theme', () => {
      expect(darkVars['destructive-foreground']).toBeDefined();
      expect(darkVars['destructive-foreground']).toBe('210 40% 98%');
    });

    it('should define --border for dark theme', () => {
      expect(darkVars['border']).toBeDefined();
      expect(darkVars['border']).toBe('0 0% 25%');
    });

    it('should define --input for dark theme', () => {
      expect(darkVars['input']).toBeDefined();
      expect(darkVars['input']).toBe('0 0% 25%');
    });

    it('should define --ring for dark theme', () => {
      expect(darkVars['ring']).toBeDefined();
      expect(darkVars['ring']).toBe('63 100% 71%');
    });

    it('should define --card for dark theme', () => {
      expect(darkVars['card']).toBeDefined();
      expect(darkVars['card']).toBe('0 0% 0%');
    });

    it('should define --card-foreground for dark theme', () => {
      expect(darkVars['card-foreground']).toBeDefined();
      expect(darkVars['card-foreground']).toBe('0 0% 100%');
    });

    it('should use black background and white text for dark theme', () => {
      expect(darkVars['background']).toBe('0 0% 0%');
      expect(darkVars['foreground']).toBe('0 0% 100%');
    });
  });
});
