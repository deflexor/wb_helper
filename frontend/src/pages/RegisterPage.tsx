import { useNavigate } from 'react-router-dom';
import { AuthCard } from '@/components/features/auth/AuthCard';
import { RegisterForm } from '@/components/features/auth/RegisterForm';
import { t } from '@/i18n';

export function RegisterPage() {
  const navigate = useNavigate();

  const handleSwitchToLogin = () => {
    navigate('/login');
  };

  return (
    <AuthCard
      title={t('auth.registerTitle')}
      description={t('layout.header.title')}
    >
      <RegisterForm onSwitchToLogin={handleSwitchToLogin} />
    </AuthCard>
  );
}
