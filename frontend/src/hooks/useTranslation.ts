import { useTranslation as useI18nextTranslation } from 'react-i18next'

/**
 * Project wrapper around react-i18next for consistent usage in components.
 */
export function useTranslation() {
  return useI18nextTranslation()
}
