export type ScatterPoint = {
  id: string
  label: string
  price: number
  rating: number
}

export function competitionDensityFromMatches(count: number): string {
  if (count >= 12) return 'high'
  if (count >= 5) return 'medium'
  return 'low'
}

/** Split free-text summary into overview bullets vs gap-style lines. */
export function extractGapBullets(summary: string | null, max = 6): string[] {
  if (!summary) return []
  const lines = summary
    .split(/\n+/)
    .map((l) => l.replace(/^[-*•]\s*/, '').trim())
    .filter(Boolean)
  const gaps = lines.filter(
    (l) =>
      /gap|missing|lack|without|underrepresented|weak|no\s+/i.test(l) ||
      l.length > 40,
  )
  const pick = gaps.length >= 2 ? gaps : lines
  return pick.slice(0, max)
}

export function averagePriceFromTexts(texts: string[]): number | null {
  const prices: number[] = []
  const re = /(\d[\d\s]{2,6})\s*(?:₽|руб|RUB|rub)/gi
  for (const t of texts) {
    let m: RegExpExecArray | null
    const s = t.slice(0, 500)
    while ((m = re.exec(s)) !== null) {
      const n = parseInt(m[1].replace(/\s/g, ''), 10)
      if (n > 100 && n < 10_000_000) prices.push(n)
    }
  }
  if (!prices.length) return null
  return Math.round(prices.reduce((a, b) => a + b, 0) / prices.length)
}

/** Deterministic scatter for “positioning” visualization (seeded by query). */
export function buildCompetitorScatter(query: string, n = 12): ScatterPoint[] {
  let h = 0
  for (let i = 0; i < query.length; i++) h = (h * 33 + query.charCodeAt(i)) >>> 0
  const out: ScatterPoint[] = []
  for (let i = 0; i < n; i++) {
    h = (h * 1664525 + 1013904223) >>> 0
    const u = h / 2 ** 32
    h = (h * 1664525 + 1013904223) >>> 0
    const v = h / 2 ** 32
    out.push({
      id: `c-${i}`,
      label: `Offer ${i + 1}`,
      price: 800 + Math.floor(u * 4200),
      rating: 3.5 + v * 1.4,
    })
  }
  return out
}
