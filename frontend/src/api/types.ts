import type { SubscriptionTier } from '@/stores/sessionStore'

export type AuthResponse = {
  token: string
  user_id: string
  tier: SubscriptionTier
}

export type LoginBody = {
  email: string
  password: string
}

export type RegisterBody = LoginBody

export type MonitoringRow = {
  id: string
  name: string
  imageUrl: string
  currentPrice: number
  competitorPrice: number
  gapFraction: number
  status: 'high_risk' | 'optimal'
  updatedAt: string
}
