import { useMemo } from 'react'

import {
  formatCurrency as formatCurrencyUtil,
  formatDate as formatDateUtil,
  formatPercent as formatPercentUtil,
  toBcp47,
} from '@/lib/localeFormat'
import { useTranslation } from '@/hooks/useTranslation'

export function useLocaleFormat() {
  const { i18n } = useTranslation()
  const locale = toBcp47(i18n.language)

  return useMemo(
    () => ({
      locale,
      formatCurrency: (amount: number, currency = 'RUB') =>
        formatCurrencyUtil(amount, locale, currency),
      formatDate: (date: Date) => formatDateUtil(date, locale),
      formatPercent: (fraction: number) =>
        formatPercentUtil(fraction, locale),
    }),
    [locale],
  )
}
