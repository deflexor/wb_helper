import { apiPostJsonAuth } from '@/api/client'
import type { ChatCompletionResult, NicheAnalysisResult } from '@/api/types'

export async function postAiChat(
  token: string,
  body: {
    tool: 'seo' | 'review' | 'pricing' | 'returns' | 'default'
    messages: { role: string; content: string }[]
    context?: Record<string, unknown>
  },
): Promise<ChatCompletionResult> {
  const raw = await apiPostJsonAuth<{
    content: string
    model_used: string
    warnings?: string[]
    usage?: TokenUsageDto | null
  }>('/api/ai/chat', body, token)
  return {
    content: raw.content,
    model_used: raw.model_used,
    warnings: raw.warnings ?? [],
    usage: normalizeUsage(raw.usage),
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
  return apiPostJsonAuth<NicheAnalysisResult>('/api/ai/niche', body, token)
}
