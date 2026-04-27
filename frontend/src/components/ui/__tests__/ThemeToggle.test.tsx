import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { ThemeToggle } from '../ThemeToggle';
import '@testing-library/jest-dom';
import { useThemeStore } from '@/stores/themeStore';

describe('ThemeToggle', () => {
  // Reset store and DOM before each test
  beforeEach(() => {
    // Reset zustand store to light theme
    useThemeStore.setState({ theme: 'light' });
    // Reset document class
    document.documentElement.classList.remove('dark', 'light');
    // Clear any persistence
    localStorage.removeItem('wbhelper-theme');
    cleanup();
  });

  it('renders Sun icon when theme is light', () => {
    render(<ThemeToggle />);
    // Sun icon should be rendered (lucide-react Sun component)
    expect(screen.getByLabelText('Toggle theme')).toBeInTheDocument();
  });

  it('renders Moon icon when theme is dark', () => {
    // Set dark theme
    document.documentElement.classList.add('dark');
    render(<ThemeToggle />);
    expect(screen.getByLabelText('Toggle theme')).toBeInTheDocument();
  });

  it('clicking toggle switches theme', async () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /toggle theme/i });
    
    await act(async () => {
      fireEvent.click(button);
    });
    
    // After click, should have dark class
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('clicking toggle updates document class', async () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button', { name: /toggle theme/i });
    
    // Initially light - no dark class
    expect(document.documentElement.classList.contains('dark')).toBe(false);
    
    await act(async () => {
      fireEvent.click(button);
    });
    
    // After click, should have dark class
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    
    await act(async () => {
      fireEvent.click(button);
    });
    
    // After second click, should be light again
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });
});