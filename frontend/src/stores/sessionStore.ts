import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type SubscriptionTier = 'free' | 'paid'

export type SessionState = {
  token: string | null
  userId: string | null
  tier: SubscriptionTier | null
  setSession: (payload: {
    token: string
    userId: string
    tier: SubscriptionTier
  }) => void
  clearSession: () => void
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set) => ({
      token: null,
      userId: null,
      tier: null,
      setSession: ({ token, userId, tier }) =>
        set({ token, userId, tier }),
      clearSession: () => set({ token: null, userId: null, tier: null }),
    }),
    {
      name: 'wb-helper-session',
      partialize: (s) => ({
        token: s.token,
        userId: s.userId,
        tier: s.tier,
      }),
    },
  ),
)
