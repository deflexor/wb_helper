import { useNavigate } from 'react-router-dom';
import { AuthCard } from '@/components/features/auth/AuthCard';
import { LoginForm } from '@/components/features/auth/LoginForm';
import { t } from '@/i18n';

export function LoginPage() {
  const navigate = useNavigate();

  const handleSwitchToRegister = () => {
    navigate('/register');
  };

  return (
    <AuthCard
      title={t('auth.loginTitle')}
      description={t('layout.header.title')}
    >
      <LoginForm onSwitchToRegister={handleSwitchToRegister} />
    </AuthCard>
  );
}
