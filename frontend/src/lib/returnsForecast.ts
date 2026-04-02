import type { MonitoringRow } from '@/api/types'

export type ReturnTrendPoint = {
  label: string
  rate: number
}

export type HeatCell = {
  row: string
  col: string
  intensity: number
}

function hashToUnit(s: string): number {
  let h = 0
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0
  return (h % 10_007) / 10_007
}

/** Deterministic pseudo return rate curve per product (for demo / empty-AI charts). */
export function buildReturnsTrendSeries(
  productId: string,
  weeks = 8,
): ReturnTrendPoint[] {
  const seed = hashToUnit(productId)
  const out: ReturnTrendPoint[] = []
  for (let i = 0; i < weeks; i++) {
    const wobble = Math.sin(seed * 12 + i * 0.7) * 0.012
    const base = 0.04 + seed * 0.06 + i * 0.002
    out.push({
      label: `W${i + 1}`,
      rate: Math.min(0.35, Math.max(0.01, base + wobble)),
    })
  }
  return out
}

const WEEK_LABELS = ['W1', 'W2', 'W3', 'W4', 'W5', 'W6']

export function buildReturnsHeatmap(products: MonitoringRow[]): HeatCell[] {
  const cells: HeatCell[] = []
  for (const p of products) {
    for (const w of WEEK_LABELS) {
      const key = `${p.id}-${w}`
      const intensity = hashToUnit(key)
      cells.push({ row: p.name.slice(0, 24), col: w, intensity })
    }
  }
  return cells
}

export type ReturnsInsightRow = {
  productId: string
  productName: string
  reasons: string[]
  recommendations: string[]
}

export function parseReturnsInsightsJson(
  content: string,
): ReturnsInsightRow[] | null {
  const raw = content.trim().replace(/^```(?:json)?\s*|\s*```$/g, '')
  try {
    const j = JSON.parse(raw) as { items?: unknown }
    if (!Array.isArray(j.items)) return null
    const rows: ReturnsInsightRow[] = []
    for (const it of j.items) {
      if (!it || typeof it !== 'object') continue
      const o = it as Record<string, unknown>
      const productId = typeof o.productId === 'string' ? o.productId : ''
      const productName = typeof o.productName === 'string' ? o.productName : ''
      const reasons = Array.isArray(o.reasons)
        ? o.reasons.filter((r): r is string => typeof r === 'string')
        : []
      const recommendations = Array.isArray(o.recommendations)
        ? o.recommendations.filter((r): r is string => typeof r === 'string')
        : []
      if (productId || productName) {
        rows.push({ productId, productName, reasons, recommendations })
      }
    }
    return rows.length ? rows : null
  } catch {
    return null
  }
}

export function defaultHighRiskRows(products: MonitoringRow[]): ReturnsInsightRow[] {
  return products
    .filter((p) => p.status === 'high_risk')
    .map((p) => ({
      productId: p.id,
      productName: p.name,
      reasons: [
        'Price gap vs. competitors may drive buyer regret after delivery.',
        'Category commonly sees sizing / expectation mismatches.',
      ],
      recommendations: [
        'Update size chart and model photos.',
        'Add FAQ on materials and care.',
      ],
    }))
}
