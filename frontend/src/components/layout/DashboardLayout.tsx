import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'

import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppTopBar } from '@/components/layout/AppTopBar'
import { MobileNavSheet } from '@/components/layout/MobileNavSheet'
import { useSessionStore } from '@/stores/sessionStore'
import { useUiStore } from '@/stores/uiStore'

export function DashboardLayout() {
  const tier = useSessionStore((s) => s.tier)
  const quotaState = useUiStore((s) => s.quotaState)
  const clearQuotaState = useUiStore((s) => s.clearQuotaState)
  const clearUsageState = useUiStore((s) => s.clearUsageState)

  function unlockQuotaState() {
    clearQuotaState()
    clearUsageState()
  }

  useEffect(() => {
    if (!quotaState) return
    if (tier === 'paid') {
      unlockQuotaState()
      return
    }
    const resetAt = new Date(quotaState.resets_at_utc).getTime()
    if (!Number.isNaN(resetAt) && resetAt <= Date.now()) {
      unlockQuotaState()
    }
  }, [tier, quotaState, clearQuotaState, clearUsageState])

  useEffect(() => {
    if (!quotaState || tier === 'paid') return
    const resetAt = new Date(quotaState.resets_at_utc).getTime()
    if (Number.isNaN(resetAt)) return
    const delayMs = resetAt - Date.now()
    if (delayMs <= 0) return
    const timeout = window.setTimeout(() => {
      unlockQuotaState()
    }, delayMs)
    return () => window.clearTimeout(timeout)
  }, [tier, quotaState, clearQuotaState, clearUsageState])

  return (
    <div className="bg-background min-h-svh">
      <AppSidebar className="hidden md:flex" />
      <MobileNavSheet />
      <div className="md:pl-64">
        <AppTopBar />
        <main className="pt-20 pb-4 md:pt-0 md:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
