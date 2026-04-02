import type { TokenUsage } from '@/api/types'

export type SeoContent = {
  title: string
  description: string
  keywords: string[]
}

/** Rough OpenRouter-style estimate when the API omits usage (USD, illustrative). */
const USD_PER_1K_TOKENS = 0.0015

export function stripCodeFences(text: string): string {
  const t = text.trim()
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/m.exec(t)
  if (fence) return fence[1].trim()
  return t
}

export function parseSeoJsonFromModel(content: string): SeoContent | null {
  const raw = stripCodeFences(content)
  try {
    const j = JSON.parse(raw) as Record<string, unknown>
    const title = typeof j.title === 'string' ? j.title : ''
    const description = typeof j.description === 'string' ? j.description : ''
    let keywords: string[] = []
    if (Array.isArray(j.keywords)) {
      keywords = j.keywords.filter((k): k is string => typeof k === 'string')
    } else if (typeof j.keywords === 'string') {
      keywords = j.keywords.split(',').map((s) => s.trim()).filter(Boolean)
    }
    if (!title && !description && keywords.length === 0) return null
    return { title, description, keywords }
  } catch {
    return null
  }
}

export function estimateUsdFromUsage(usage: TokenUsage | null): number | null {
  if (!usage || usage.total_tokens <= 0) return null
  return (usage.total_tokens / 1000) * USD_PER_1K_TOKENS
}

export function roughTokenEstimateFromText(text: string): number {
  return Math.ceil(text.length / 4)
}
