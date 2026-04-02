import { describe, expect, it } from 'vitest'

import {
  estimateUsdFromUsage,
  parseSeoJsonFromModel,
  roughTokenEstimateFromText,
  stripCodeFences,
} from '@/lib/seoGeneration'

describe('stripCodeFences', () => {
  it('removes json fence', () => {
    expect(stripCodeFences('```json\n{"a":1}\n```')).toBe('{"a":1}')
  })
})

describe('parseSeoJsonFromModel', () => {
  it('parses object with keyword array', () => {
    const r = parseSeoJsonFromModel(
      '{"title":"T","description":"D","keywords":["a","b"]}',
    )
    expect(r).toEqual({
      title: 'T',
      description: 'D',
      keywords: ['a', 'b'],
    })
  })

  it('returns null on invalid json', () => {
    expect(parseSeoJsonFromModel('not json')).toBeNull()
  })
})

describe('estimateUsdFromUsage', () => {
  it('returns null for empty usage', () => {
    expect(estimateUsdFromUsage(null)).toBeNull()
    expect(
      estimateUsdFromUsage({
        prompt_tokens: 0,
        completion_tokens: 0,
        total_tokens: 0,
      }),
    ).toBeNull()
  })

  it('computes positive estimate', () => {
    const v = estimateUsdFromUsage({
      prompt_tokens: 1000,
      completion_tokens: 500,
      total_tokens: 1500,
    })
    expect(v).toBeGreaterThan(0)
  })
})

describe('roughTokenEstimateFromText', () => {
  it('scales with length', () => {
    expect(roughTokenEstimateFromText('abcd')).toBe(1)
    expect(roughTokenEstimateFromText('x'.repeat(40))).toBe(10)
  })
})
