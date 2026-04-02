import { describe, expect, it } from 'vitest'

import type { MonitoringRow } from '@/api/types'
import {
  buildReturnsHeatmap,
  buildReturnsTrendSeries,
  defaultHighRiskRows,
  parseReturnsInsightsJson,
} from '@/lib/returnsForecast'

const sample: MonitoringRow[] = [
  {
    id: '1',
    name: 'Mug',
    imageUrl: '',
    currentPrice: 100,
    competitorPrice: 90,
    gapFraction: 0.1,
    status: 'high_risk',
    updatedAt: '',
  },
]

describe('buildReturnsTrendSeries', () => {
  it('returns stable length', () => {
    const a = buildReturnsTrendSeries('p1', 8)
    const b = buildReturnsTrendSeries('p1', 8)
    expect(a.length).toBe(8)
    expect(a).toEqual(b)
  })
})

describe('buildReturnsHeatmap', () => {
  it('creates cells per product and week', () => {
    const cells = buildReturnsHeatmap(sample)
    expect(cells.length).toBeGreaterThan(0)
  })
})

describe('parseReturnsInsightsJson', () => {
  it('parses items array', () => {
    const rows = parseReturnsInsightsJson(
      '{"items":[{"productId":"1","productName":"Mug","reasons":["a"],"recommendations":["b"]}]}',
    )
    expect(rows).toHaveLength(1)
    expect(rows?.[0].reasons).toContain('a')
  })
})

describe('defaultHighRiskRows', () => {
  it('filters high risk', () => {
    const rows = defaultHighRiskRows(sample)
    expect(rows).toHaveLength(1)
    expect(rows[0].productId).toBe('1')
  })
})
