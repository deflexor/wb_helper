import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from '../setup.tsx';
import { LoginForm } from '@/components/features/auth/LoginForm';
import { RegisterForm } from '@/components/features/auth/RegisterForm';
import { AuthCard } from '@/components/features/auth/AuthCard';
import { useAuthStore, authApi } from '@/stores/authStore';
import i18n from '@/i18n';
import '@testing-library/jest-dom';
import { fireEvent, waitFor } from '@testing-library/react';

// Mock auth store
vi.mock('@/stores/authStore', () => ({
  useAuthStore: vi.fn().mockReturnValue({
    login: vi.fn(),
    setLoading: vi.fn(),
    isLoading: false,
  }),
  authApi: {
    login: vi.fn(),
    register: vi.fn(),
  },
  isValidEmail: (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email),
  isValidPassword: (password: string) => password.length >= 6,
}));

describe('LoginForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate email field - show error for invalid email format', async () => {
    // Arrange
    const { getByLabelText, getByText } = renderWithProviders(<LoginForm />);
    const emailInput = getByLabelText(i18n.t('auth.email'));
    const passwordInput = getByLabelText(i18n.t('auth.password'));

    // Act - enter invalid email and password, then submit
    fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.submit(emailInput.closest('form')!);

    // Wait for validation
    await waitFor(() => {
      // Assert - error message should be displayed
      expect(getByText(i18n.t('auth.invalidEmail'))).toBeInTheDocument();
    });
  });

  it('should validate password field - show error for short password', async () => {
    // Arrange
    const { getByLabelText, getByText } = renderWithProviders(<LoginForm />);
    const emailInput = getByLabelText(i18n.t('auth.email'));
    const passwordInput = getByLabelText(i18n.t('auth.password'));

    // Act - enter valid email but short password, then submit
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: '123' } });
    fireEvent.submit(emailInput.closest('form')!);

    // Wait for validation
    await waitFor(() => {
      // Assert - error message should be displayed
      expect(getByText(i18n.t('auth.passwordTooShort'))).toBeInTheDocument();
    });
  });

  it('should submit successfully with valid email and password', async () => {
    // Arrange
    const mockLogin = vi.fn().mockResolvedValue({
      user: { id: '1', email: 'test@example.com', name: 'Test', subscriptionPlan: 'free', apiCallsLimit: 1000 },
      token: 'test-token',
    });
    (authApi.login as any).mockImplementation(mockLogin);

    const { getByLabelText, getByText } = renderWithProviders(<LoginForm />);
    const emailInput = getByLabelText(i18n.t('auth.email'));
    const passwordInput = getByLabelText(i18n.t('auth.password'));

    // Act - enter valid credentials
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.submit(emailInput.closest('form')!);

    // Assert - login was called
    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });
});

describe('RegisterForm', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should validate email field - show error for invalid email', async () => {
    // Arrange
    const { getByLabelText, getByText } = renderWithProviders(<RegisterForm />);
    const emailInput = getByLabelText(i18n.t('auth.email'));
    const passwordInput = getByLabelText(i18n.t('auth.password'));
    const confirmPasswordInput = getByLabelText(i18n.t('auth.confirmPassword'));

    // Act - enter invalid email and valid passwords
    fireEvent.change(emailInput, { target: { value: 'not-an-email' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.submit(emailInput.closest('form')!);

    // Assert
    await waitFor(() => {
      expect(getByText(i18n.t('auth.invalidEmail'))).toBeInTheDocument();
    });
  });

  it('should validate password match - show error when passwords do not match', async () => {
    // Arrange
    const { getByLabelText, getByText } = renderWithProviders(<RegisterForm />);
    const emailInput = getByLabelText(i18n.t('auth.email'));
    const passwordInput = getByLabelText(i18n.t('auth.password'));
    const confirmPasswordInput = getByLabelText(i18n.t('auth.confirmPassword'));

    // Act - enter valid email and password but mismatched confirm password
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'differentpassword' } });
    fireEvent.submit(emailInput.closest('form')!);

    // Assert
    await waitFor(() => {
      expect(getByText(i18n.t('auth.passwordMismatch'))).toBeInTheDocument();
    });
  });

  it('should submit successfully when all fields are valid', async () => {
    // Arrange
    const mockRegister = vi.fn().mockResolvedValue({
      user: { id: '1', email: 'test@example.com', name: 'Test', subscriptionPlan: 'free', apiCallsLimit: 1000 },
      token: 'test-token',
    });
    (authApi.register as any).mockImplementation(mockRegister);

    const { getByLabelText } = renderWithProviders(<RegisterForm />);
    const emailInput = getByLabelText(i18n.t('auth.email'));
    const passwordInput = getByLabelText(i18n.t('auth.password'));
    const confirmPasswordInput = getByLabelText(i18n.t('auth.confirmPassword'));

    // Act
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.change(confirmPasswordInput, { target: { value: 'password123' } });
    fireEvent.submit(emailInput.closest('form')!);

    // Assert
    await waitFor(() => {
      expect(mockRegister).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });
});

describe('AuthCard', () => {
  it('should render children elements', async () => {
    // Arrange
    const { getByText } = renderWithProviders(
      <AuthCard>
        <div>Test Child Content</div>
      </AuthCard>
    );

    // Assert
    expect(getByText('Test Child Content')).toBeInTheDocument();
  });

  it('should render with title when provided', async () => {
    // Arrange
    const { getByText } = renderWithProviders(
      <AuthCard title="Test Title">
        <div>Child Content</div>
      </AuthCard>
    );

    // Assert
    expect(getByText('Test Title')).toBeInTheDocument();
  });

  it('should render with description when provided', async () => {
    // Arrange
    const { getByText } = renderWithProviders(
      <AuthCard description="Test Description">
        <div>Child Content</div>
      </AuthCard>
    );

    // Assert
    expect(getByText('Test Description')).toBeInTheDocument();
  });
});
