import { create } from 'zustand'

import type { QuotaExceededError, QuotaUsageSnapshot } from '@/api/types'
import i18n from '@/i18n'

export type MonitoringRiskFilter = 'all' | 'high' | 'optimal'

export type UiState = {
  mobileNavOpen: boolean
  setMobileNavOpen: (open: boolean) => void
  monitoringSearch: string
  setMonitoringSearch: (value: string) => void
  monitoringRiskFilter: MonitoringRiskFilter
  setMonitoringRiskFilter: (value: MonitoringRiskFilter) => void
  /** Mirrored for Zustand subscribers; i18n remains source of truth for persistence. */
  language: 'en' | 'ru'
  setLanguage: (lng: 'en' | 'ru') => void
  syncLanguageFromI18n: () => void
  quotaState: QuotaExceededError | null
  setQuotaState: (quota: QuotaExceededError) => void
  clearQuotaState: () => void
  usageState: QuotaUsageSnapshot | null
  setUsageState: (usage: QuotaUsageSnapshot) => void
  clearUsageState: () => void
}

function detectLanguage(): 'en' | 'ru' {
  const lng = i18n.language ?? 'en'
  return lng.startsWith('ru') ? 'ru' : 'en'
}

export const useUiStore = create<UiState>((set) => ({
  mobileNavOpen: false,
  setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
  monitoringSearch: '',
  setMonitoringSearch: (monitoringSearch) => set({ monitoringSearch }),
  monitoringRiskFilter: 'all',
  setMonitoringRiskFilter: (monitoringRiskFilter) =>
    set({ monitoringRiskFilter }),
  language: detectLanguage(),
  setLanguage: (lng) => {
    void i18n.changeLanguage(lng)
    set({ language: lng })
  },
  syncLanguageFromI18n: () => set({ language: detectLanguage() }),
  quotaState: null,
  setQuotaState: (quotaState) => set({ quotaState }),
  clearQuotaState: () => set({ quotaState: null }),
  usageState: null,
  setUsageState: (usageState) => set({ usageState }),
  clearUsageState: () => set({ usageState: null }),
}))

i18n.on('languageChanged', () => {
  useUiStore.getState().syncLanguageFromI18n()
})
