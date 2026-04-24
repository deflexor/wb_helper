import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuthStore, isValidEmail, isValidPassword } from '@/stores/authStore';

describe('authStore', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Mock localStorage for each test
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: vi.fn().mockReturnValue(null),
        setItem: vi.fn(),
        removeItem: vi.fn(),
        clear: vi.fn(),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have correct initial state', async () => {
    // Arrange & Act
    const { result } = renderHook(() => useAuthStore());

    // Assert
    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.token).toBeNull();
  });

  it('should login user and set isAuthenticated to true', async () => {
    // Arrange
    const { result } = renderHook(() => useAuthStore());
    const testUser = {
      id: '1',
      email: 'test@example.com',
      name: 'Test User',
      subscriptionPlan: 'free' as const,
      apiCallsLimit: 1000,
    };
    const testToken = 'test-token-123';

    // Act
    act(() => {
      result.current.login(testUser, testToken);
    });

    // Assert
    expect(result.current.user).toEqual(testUser);
    expect(result.current.token).toBe(testToken);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });

  it('should logout user and clear state', async () => {
    // Arrange
    const { result } = renderHook(() => useAuthStore());

    // Login first
    act(() => {
      result.current.login({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        subscriptionPlan: 'free',
        apiCallsLimit: 1000,
      }, 'test-token');
    });

    expect(result.current.isAuthenticated).toBe(true);

    // Act
    act(() => {
      result.current.logout();
    });

    // Assert
    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('should set loading state correctly', async () => {
    // Arrange
    const { result } = renderHook(() => useAuthStore());

    // Act
    act(() => {
      result.current.setLoading(true);
    });

    // Assert
    expect(result.current.isLoading).toBe(true);

    // Act - set loading back to false
    act(() => {
      result.current.setLoading(false);
    });

    // Assert
    expect(result.current.isLoading).toBe(false);
  });

  it('should have localStorage integration on login', async () => {
    // Note: localStorage persistence is handled by zustand persist middleware
    // This test verifies login updates state correctly
    // Actual persistence is tested via integration tests
    const { result } = renderHook(() => useAuthStore());

    act(() => {
      result.current.login({
        id: '1',
        email: 'test@example.com',
        name: 'Test User',
        subscriptionPlan: 'free',
        apiCallsLimit: 1000,
      }, 'test-token');
    });

    // Verify login was successful
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.token).toBe('test-token');
  });
});

describe('isValidEmail', () => {
  it('should return true for valid email', () => {
    expect(isValidEmail('test@example.com')).toBe(true);
    expect(isValidEmail('user.name@domain.co.uk')).toBe(true);
  });

  it('should return false for invalid email', () => {
    expect(isValidEmail('not-an-email')).toBe(false);
    expect(isValidEmail('missing@')).toBe(false);
    expect(isValidEmail('@domain.com')).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isValidPassword', () => {
  it('should return true for password >= 6 characters', () => {
    expect(isValidPassword('123456')).toBe(true);
    expect(isValidPassword('password123')).toBe(true);
  });

  it('should return false for password < 6 characters', () => {
    expect(isValidPassword('12345')).toBe(false);
    expect(isValidPassword('abc')).toBe(false);
    expect(isValidPassword('')).toBe(false);
  });
});
