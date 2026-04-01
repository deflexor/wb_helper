import { Outlet } from 'react-router-dom'

import { AppSidebar } from '@/components/layout/AppSidebar'
import { AppTopBar } from '@/components/layout/AppTopBar'
import { MobileNavSheet } from '@/components/layout/MobileNavSheet'

export function DashboardLayout() {
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
