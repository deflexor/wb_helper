/** BCP 47 locale for Intl formatters (i18next may return "en" or "en-US"). */
export function toBcp47(language: string): string {
  const base = language.split('-')[0]?.toLowerCase() ?? 'en'
  if (base === 'ru') return 'ru-RU'
  return 'en-US'
}

export function formatCurrency(
  amount: number,
  locale: string,
  currency = 'RUB',
): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatDate(date: Date, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    dateStyle: 'medium',
  }).format(date)
}

/** @param fraction — e.g. 0.127 for 12.7% */
export function formatPercent(fraction: number, locale: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'percent',
    maximumFractionDigits: 1,
  }).format(fraction)
}
