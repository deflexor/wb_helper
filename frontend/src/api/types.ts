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

export type TokenUsage = {
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
}

export type ChatCompletionResult = {
  content: string
  model_used: string
  warnings: string[]
  usage: TokenUsage | null
  quota_usage?: QuotaUsageSnapshot | null
}

export type NicheAnalysisResult = {
  matches: Record<string, unknown>[]
  summary: string | null
  quota_usage?: QuotaUsageSnapshot | null
}

export type QuotaExceededError = {
  code: 'daily_quota_exceeded'
  message: string
  used: number
  limit: number
  resets_at_utc: string
  upgrade_url: string
}

export type ApiErrorCode =
  | 'daily_quota_exceeded'
  | 'quota_backend_unavailable'
  | 'unknown'

export type QuotaUsageSnapshot = {
  used: number
  limit: number
}
