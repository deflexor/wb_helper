import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Premium feature types
export type PremiumFeature = 'niche_analysis' | 'returns_forecast' | 'seo_content_generation' | 'competitor_analysis_full';

// User type - extended with subscription info
interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  subscriptionPlan: 'free' | 'pro' | 'enterprise';
  apiCallsLimit: number;
}

// Auth state interface
interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
  setLoading: (loading: boolean) => void;
  isPremium: () => boolean;
  canAccess: (feature: PremiumFeature) => boolean;
}

// Mock login function with 1s delay
const mockLogin = async (email: string, _password: string): Promise<{ user: User; token: string }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const user: User = {
        id: '1',
        email,
        name: email.split('@')[0],
        subscriptionPlan: 'free',
        apiCallsLimit: 1000,
      };
      const token = btoa(`${email}:${Date.now()}`);
      resolve({ user, token });
    }, 1000);
  });
};

// Mock register function with 1s delay
const mockRegister = async (email: string, _password: string): Promise<{ user: User; token: string }> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const user: User = {
        id: '1',
        email,
        name: email.split('@')[0],
        subscriptionPlan: 'free',
        apiCallsLimit: 1000,
      };
      const token = btoa(`${email}:${Date.now()}`);
      resolve({ user, token });
    }, 1000);
  });
};

// Premium features available only to pro/enterprise users
const PREMIUM_FEATURES: PremiumFeature[] = [
  'niche_analysis',
  'returns_forecast',
  'seo_content_generation',
  'competitor_analysis_full',
];

// Check if a feature requires premium subscription
const isPremiumFeature = (feature: PremiumFeature): boolean => {
  return PREMIUM_FEATURES.includes(feature);
};

// Auth store with persistence
export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      token: null,
      login: (user, token) => set({ user, token, isAuthenticated: true, isLoading: false }),
      logout: () => set({ user: null, token: null, isAuthenticated: false, isLoading: false }),
      setLoading: (loading) => set({ isLoading: loading }),
      isPremium: () => {
        const user = get().user;
        return user?.subscriptionPlan === 'pro' || user?.subscriptionPlan === 'enterprise';
      },
      canAccess: (feature: PremiumFeature) => {
        const user = get().user;
        // Non-premium features are accessible to all
        if (!isPremiumFeature(feature)) {
          return true;
        }
        // Pro/Enterprise users can access premium features
        if (user?.subscriptionPlan === 'pro' || user?.subscriptionPlan === 'enterprise') {
          return true;
        }
        // Free users cannot access premium features
        return false;
      },
    }),
    {
      name: 'wbhelper-auth',
    }
  )
);

// Export mock API functions for use in forms
export const authApi = {
  login: mockLogin,
  register: mockRegister,
};

// Email validation regex
export const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Password validation (min 6 chars)
export const isValidPassword = (password: string): boolean => {
  return password.length >= 6;
};
