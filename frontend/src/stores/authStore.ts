import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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

// Auth store with persistence
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      token: null,
      login: (user, token) => set({ user, token, isAuthenticated: true, isLoading: false }),
      logout: () => set({ user: null, token: null, isAuthenticated: false, isLoading: false }),
      setLoading: (loading) => set({ isLoading: loading }),
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
