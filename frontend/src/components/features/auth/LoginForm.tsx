import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore, authApi, isValidEmail, isValidPassword } from '@/stores/authStore';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { t } from '@/i18n';

interface LoginFormProps {
  onSwitchToRegister?: () => void;
}

export function LoginForm({ onSwitchToRegister }: LoginFormProps) {
  const navigate = useNavigate();
  const { login, setLoading, isLoading } = useAuthStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});

  const validate = useCallback((): boolean => {
    const newErrors: { email?: string; password?: string } = {};

    if (!email) {
      newErrors.email = t('auth.invalidEmail');
    } else if (!isValidEmail(email)) {
      newErrors.email = t('auth.invalidEmail');
    }

    if (!password) {
      newErrors.password = t('auth.passwordTooShort');
    } else if (!isValidPassword(password)) {
      newErrors.password = t('auth.passwordTooShort');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [email, password]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    if (!validate()) {
      return;
    }

    setLoading(true);

    try {
      const { user, token } = await authApi.login(email, password);
      login(user, token);
      navigate('/dashboard');
    } catch {
      setErrors({ general: t('auth.loginError') });
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Email field */}
      <div className="space-y-2">
        <label htmlFor="login-email" className="text-sm text-muted-foreground">
          {t('auth.email')}
        </label>
        <Input
          id="login-email"
          type="email"
          placeholder={t('auth.emailPlaceholder')}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={isLoading}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email}</p>
        )}
      </div>

      {/* Password field */}
      <div className="space-y-2">
        <label htmlFor="login-password" className="text-sm text-muted-foreground">
          {t('auth.password')}
        </label>
        <Input
          id="login-password"
          type="password"
          placeholder={t('auth.passwordPlaceholder')}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={isLoading}
          aria-invalid={!!errors.password}
        />
        {errors.password && (
          <p className="text-sm text-red-500">{errors.password}</p>
        )}
      </div>

      {/* General error */}
      {errors.general && (
        <p className="text-sm text-red-500">{errors.general}</p>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        disabled={isLoading}
        className="w-full bg-[#faff69] text-[#151515] hover:bg-[#faff69]/90"
      >
        {isLoading ? t('common.loading') : t('auth.loginButton')}
      </Button>

      {/* Switch to register link */}
      {onSwitchToRegister && (
        <p className="text-sm text-center text-muted-foreground">
          {t('auth.noAccount')}{' '}
          <button
            type="button"
            onClick={onSwitchToRegister}
            className="text-[#faff69] hover:underline"
          >
            {t('auth.signUp')}
          </button>
        </p>
      )}
    </form>
  );
}
