import { apiPostJsonAuthWithHeaders } from '@/api/client'
import type {
  ChatCompletionResult,
  NicheAnalysisResult,
  QuotaUsageSnapshot,
} from '@/api/types'
export { isQuotaExceededApiError } from '@/api/client'
export type { QuotaExceededError } from '@/api/types'

export async function postAiChat(
  token: string,
  body: {
    tool: 'seo' | 'review' | 'pricing' | 'returns' | 'default'
    messages: { role: string; content: string }[]
    context?: Record<string, unknown>
  },
): Promise<ChatCompletionResult> {
  const { data: raw, headers } = await apiPostJsonAuthWithHeaders<{
    content: string
    model_used: string
    warnings?: string[]
    usage?: TokenUsageDto | null
  }>('/api/ai/chat', body, token)
  const quotaUsage = quotaUsageFromHeaders(headers)
  return {
    content: raw.content,
    model_used: raw.model_used,
    warnings: raw.warnings ?? [],
    usage: normalizeUsage(raw.usage),
    quota_usage: quotaUsage,
  }
}

type TokenUsageDto = {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
}

function normalizeUsage(u: TokenUsageDto | null | undefined) {
  if (!u) return null
  return {
    prompt_tokens: u.prompt_tokens ?? 0,
    completion_tokens: u.completion_tokens ?? 0,
    total_tokens: u.total_tokens ?? 0,
  }
}

export async function postNicheAnalysis(
  token: string,
  body: { query: string; limit?: number },
): Promise<NicheAnalysisResult> {
  const { data, headers } = await apiPostJsonAuthWithHeaders<NicheAnalysisResult>(
    '/api/ai/niche',
    body,
    token,
  )
  return {
    ...data,
    quota_usage: quotaUsageFromHeaders(headers),
  }
}

function quotaUsageFromHeaders(headers: Headers): QuotaUsageSnapshot | null {
  const usedRaw = headers.get('x-quota-used')
  const limitRaw = headers.get('x-quota-limit')
  const used = usedRaw ? Number(usedRaw) : Number.NaN
  const limit = limitRaw ? Number(limitRaw) : Number.NaN
  if (!Number.isFinite(used) || !Number.isFinite(limit)) return null
  return { used, limit }
}
