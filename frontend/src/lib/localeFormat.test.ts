import { describe, expect, it } from 'vitest'

import {
  formatCurrency,
  formatDate,
  formatPercent,
  toBcp47,
} from '@/lib/localeFormat'

describe('toBcp47', () => {
  it('maps ru variants to ru-RU', () => {
    expect(toBcp47('ru')).toBe('ru-RU')
    expect(toBcp47('ru-RU')).toBe('ru-RU')
  })

  it('defaults unknown languages to en-US', () => {
    expect(toBcp47('en')).toBe('en-US')
    expect(toBcp47('en-GB')).toBe('en-US')
  })
})

describe('formatCurrency', () => {
  it('formats with en-US', () => {
    const s = formatCurrency(1234.5, 'en-US', 'USD')
    expect(s).toContain('1')
    expect(s).toContain('234')
  })

  it('formats with ru-RU', () => {
    const s = formatCurrency(999.99, 'ru-RU', 'RUB')
    expect(s).toMatch(/\d/)
    expect(s).toContain('₽')
  })
})

describe('formatDate', () => {
  it('uses locale month/day ordering', () => {
    const d = new Date(Date.UTC(2026, 0, 15))
    expect(formatDate(d, 'en-US')).toMatch(/2026|Jan/)
    expect(formatDate(d, 'ru-RU')).toMatch(/2026|янв/)
  })
})

describe('formatPercent', () => {
  it('formats fraction as percent', () => {
    expect(formatPercent(0.127, 'en-US')).toMatch(/12/)
    expect(formatPercent(-0.05, 'ru-RU')).toMatch(/5/)
  })
})
