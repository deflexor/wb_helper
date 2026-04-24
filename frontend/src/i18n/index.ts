import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './en.json';
import ru from './ru.json';

const resources = {
  en: { translation: en },
  ru: { translation: ru },
};

const LANGUAGE_KEY = 'wbhelper-language';

const getStoredLanguage = (): string => {
  if (typeof window !== 'undefined') {
    const stored = localStorage.getItem(LANGUAGE_KEY);
    if (stored && (stored === 'en' || stored === 'ru')) {
      return stored;
    }
  }
  return 'en';
};

const storeLanguage = (lang: string): void => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LANGUAGE_KEY, lang);
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: getStoredLanguage(),
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

i18n.on('languageChanged', (lng) => {
  storeLanguage(lng);
});

export const changeLanguage = async (lang: string): Promise<void> => {
  await i18n.changeLanguage(lang);
};

export const getCurrentLanguage = (): string => {
  return i18n.language;
};

export type TranslationKey = string;

export const t = i18n.t.bind(i18n);

export default i18n;