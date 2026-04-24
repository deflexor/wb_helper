import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import i18n, { changeLanguage, getCurrentLanguage, t } from '@/i18n';
import en from '@/i18n/en.json';
import ru from '@/i18n/ru.json';

// Helper function to get all nested keys from translation object
function getNestedKeys(obj: Record<string, any>, prefix = ''): string[] {
  const keys: string[] = [];
  for (const key in obj) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    if (typeof obj[key] === 'object' && obj[key] !== null) {
      keys.push(...getNestedKeys(obj[key], fullKey));
    } else {
      keys.push(fullKey);
    }
  }
  return keys;
}

// Helper function to get value by dot-notation key
function getValueByKey(obj: Record<string, any>, key: string): any {
  return key.split('.').reduce((o, k) => o?.[k], obj);
}

describe('i18n translations', () => {
  // Get all translation keys
  const enKeys = getNestedKeys(en.translation || en);
  const ruKeys = getNestedKeys(ru.translation || ru);

  it('should have all keys present in en.json and ru.json', () => {
    // Assert - both files should have the same keys
    expect(enKeys.sort()).toEqual(ruKeys.sort());
  });

  it('should have no missing translation keys', () => {
    // Assert - no undefined or null values
    for (const key of enKeys) {
      const enValue = getValueByKey(en.translation || en, key);
      const ruValue = getValueByKey(ru.translation || ru, key);
      expect(enValue).toBeDefined();
      expect(ruValue).toBeDefined();
    }
  });

  it('should have non-empty translation values', () => {
    // Assert - all translations should have content
    for (const key of enKeys) {
      const enValue = getValueByKey(en.translation || en, key);
      const ruValue = getValueByKey(ru.translation || ru, key);
      expect(enValue).toBeTruthy();
      expect(ruValue).toBeTruthy();
    }
  });
});

describe('language switching', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    // Reset language to English
    await changeLanguage('en');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should switch to Russian language', async () => {
    // Act
    await changeLanguage('ru');

    // Assert
    expect(getCurrentLanguage()).toBe('ru');
  });

  it('should switch to English language', async () => {
    // Arrange - start with Russian
    await changeLanguage('ru');
    expect(getCurrentLanguage()).toBe('ru');

    // Act
    await changeLanguage('en');

    // Assert
    expect(getCurrentLanguage()).toBe('en');
  });

  it('should return translated text in current language', async () => {
    // Arrange - switch to English
    await changeLanguage('en');
    const enDashboard = t('layout.dashboard');

    // Act - switch to Russian
    await changeLanguage('ru');
    const ruDashboard = t('layout.dashboard');

    // Assert - same key gives different result based on language
    expect(enDashboard).not.toEqual(ruDashboard);
    expect(enDashboard).toBe('Dashboard');
    expect(ruDashboard).toBe('Панель управления');
  });
});

describe('t function', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await changeLanguage('en');
  });

  it('should translate common keys correctly in English', () => {
    expect(t('common.loading')).toBe('Loading...');
    expect(t('common.error')).toBe('An error occurred');
    expect(t('common.cancel')).toBe('Cancel');
    expect(t('common.confirm')).toBe('Confirm');
  });

  it('should translate auth keys correctly in English', () => {
    expect(t('auth.loginTitle')).toBe('Login');
    expect(t('auth.email')).toBe('Email');
    expect(t('auth.password')).toBe('Password');
    expect(t('auth.loginButton')).toBe('Sign In');
  });

  it('should translate layout keys correctly in English', () => {
    expect(t('layout.dashboard')).toBe('Dashboard');
    expect(t('layout.competitors')).toBe('Competitors');
    expect(t('layout.optimization')).toBe('Optimization');
  });

  it('should translate competitors keys correctly in English', () => {
    expect(t('competitors.title')).toBe('Competitor Analysis');
    expect(t('competitors.product')).toBe('Product');
    expect(t('competitors.opportunity')).toBe('Opportunity');
    expect(t('competitors.risk')).toBe('Risk');
  });

  it('should translate optimization keys correctly in English', () => {
    expect(t('optimization.title')).toBe('Price Optimization');
    expect(t('optimization.preview')).toBe('Preview');
    expect(t('optimization.apply')).toBe('Apply Changes');
  });
});

describe('getCurrentLanguage', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
  });

  it('should return current language code', async () => {
    await changeLanguage('en');
    expect(getCurrentLanguage()).toBe('en');

    await changeLanguage('ru');
    expect(getCurrentLanguage()).toBe('ru');
  });
});
