import { act } from 'react';
import { renderHook } from '@testing-library/react';
import { useThemeStore } from '../themeStore';

describe('useThemeStore', () => {
  beforeEach(() => {
    // Reset store to initial state before each test
    useThemeStore.setState({ theme: 'light' });
    localStorage.clear();
  });

  it('initial theme should be light', () => {
    const { result } = renderHook(() => useThemeStore());
    expect(result.current.theme).toBe('light');
  });

  it('toggleTheme should switch from light to dark', () => {
    const { result } = renderHook(() => useThemeStore());

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('dark');
  });

  it('toggleTheme should switch from dark to light', () => {
    const { result } = renderHook(() => useThemeStore());

    // Set to dark first
    act(() => {
      result.current.setTheme('dark');
    });
    expect(result.current.theme).toBe('dark');

    // Toggle back to light
    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.theme).toBe('light');
  });

  it('setTheme should set specific theme', () => {
    const { result } = renderHook(() => useThemeStore());

    act(() => {
      result.current.setTheme('dark');
    });

    expect(result.current.theme).toBe('dark');

    act(() => {
      result.current.setTheme('light');
    });

    expect(result.current.theme).toBe('light');
  });

  it('theme should persist to localStorage', () => {
    const { result } = renderHook(() => useThemeStore());

    act(() => {
      result.current.setTheme('dark');
    });

    // Verify localStorage was updated
    const stored = localStorage.getItem('wbhelper-theme');
    expect(stored).toBeTruthy();

    const parsed = JSON.parse(stored!);
    expect(parsed.state.theme).toBe('dark');
  });
});
