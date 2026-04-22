import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export function Hello() {
  const { t, i18n } = useTranslation();
  const [greeting, setGreeting] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchGreeting = async () => {
    try {
      setLoading(true);
      setError(null);
      // Mock for now - in production this would call the backend
      // For now we use the i18n greeting
      setGreeting(t('hello.greeting'));
    } catch {
      setError(t('hello.error'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGreeting();
  }, [t]);

  const switchLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
  };

  const currentLang = i18n.language;

  return (
    <div className="container mx-auto py-8 px-4">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>{t('hello.title')}</CardTitle>
          <CardDescription>{t('hello.language')}</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>{t('hello.loading')}</p>
          ) : error ? (
            <p className="text-destructive">{error}</p>
          ) : (
            <p className="text-lg">{greeting}</p>
          )}

          <div className="flex gap-2 mt-4">
            <Button
              variant={currentLang === 'en' ? 'default' : 'outline'}
              size="sm"
              onClick={() => switchLanguage('en')}
              aria-label="English"
            >
              EN
            </Button>
            <Button
              variant={currentLang === 'ru' ? 'default' : 'outline'}
              size="sm"
              onClick={() => switchLanguage('ru')}
              aria-label="Russian"
            >
              RU
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}