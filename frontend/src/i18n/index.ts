import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      hello: {
        title: 'Hello World',
        greeting: 'Welcome to the app',
        language: 'Language',
        loading: 'Loading...',
        error: 'Failed to load greeting',
      },
    },
  },
  ru: {
    translation: {
      hello: {
        title: 'Привет Мир',
        greeting: 'Добро пожаловать в приложение',
        language: 'Язык',
        loading: 'Загрузка...',
        error: 'Ошибка загрузки приветствия',
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;