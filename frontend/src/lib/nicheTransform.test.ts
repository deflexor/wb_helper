import { describe, expect, it } from 'vitest'

import {
  averagePriceFromTexts,
  buildCompetitorScatter,
  competitionDensityFromMatches,
  extractGapBullets,
} from '@/lib/nicheTransform'

describe('competitionDensityFromMatches', () => {
  it('maps counts to labels', () => {
    expect(competitionDensityFromMatches(2)).toBe('low')
    expect(competitionDensityFromMatches(8)).toBe('medium')
    expect(competitionDensityFromMatches(20)).toBe('high')
  })
})

describe('extractGapBullets', () => {
  it('pulls gap-like lines', () => {
    const g = extractGapBullets('- Missing size chart\n- Good photos\n- Gap in warranty info')
    expect(g.some((x) => /size|Gap/i.test(x))).toBe(true)
  })
})

describe('averagePriceFromTexts', () => {
  it('parses ruble amounts', () => {
    const avg = averagePriceFromTexts(['Цена 1 299 ₽ доставка', 'ещё 2500 руб'])
    expect(avg).toBeGreaterThan(1000)
  })
})

describe('buildCompetitorScatter', () => {
  it('is deterministic per seed', () => {
    const a = buildCompetitorScatter('q', 5)
    const b = buildCompetitorScatter('q', 5)
    expect(a).toEqual(b)
    expect(a).toHaveLength(5)
  })
})
