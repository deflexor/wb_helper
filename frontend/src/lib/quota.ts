export function sanitizeUpgradeUrl(raw: string | null | undefined): string {
  if (!raw) return '/upgrade'
  try {
    const parsed = new URL(raw, window.location.origin)
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.toString()
    }
  } catch {
    // fall back below
  }
  return '/upgrade'
}

export function formatQuotaResetAt(
  isoDate: string,
  locale: string,
): string | null {
  const date = new Date(isoDate)
  if (Number.isNaN(date.getTime())) return null
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}
