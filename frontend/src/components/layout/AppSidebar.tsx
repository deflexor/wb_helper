import { NavLink } from 'react-router-dom'
import {
  BarChart3,
  LayoutDashboard,
  LineChart,
  PackageOpen,
  Search,
  Tags,
} from 'lucide-react'

import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'
import { useUiStore } from '@/stores/uiStore'
import { Button } from '@/components/ui/button'

const navClass = ({ isActive }: { isActive: boolean }) =>
  cn(
    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
    isActive
      ? 'bg-sidebar-accent text-sidebar-accent-foreground'
      : 'text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground',
  )

export function AppSidebar({ className }: { className?: string }) {
  const { t } = useTranslation()
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen)

  return (
    <aside
      className={cn(
        'bg-sidebar text-sidebar-foreground fixed inset-y-0 z-40 flex w-64 flex-col border-r border-sidebar-border shadow-sm',
        className,
      )}
    >
      <div className="flex h-14 items-center border-b border-sidebar-border px-4">
        <LayoutDashboard className="text-sidebar-primary size-5" aria-hidden />
        <span className="ml-2 font-heading text-sm font-semibold tracking-tight">
          {t('app_name')}
        </span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3" aria-label={t('nav.main_label')}>
        <NavLink to="/monitoring" className={navClass} onClick={() => setMobileNavOpen(false)}>
          <LineChart className="size-4 shrink-0 opacity-70" aria-hidden />
          {t('nav.monitoring')}
        </NavLink>
        <NavLink to="/pricing" className={navClass} onClick={() => setMobileNavOpen(false)}>
          <Tags className="size-4 shrink-0 opacity-70" aria-hidden />
          {t('nav.pricing')}
        </NavLink>
        <NavLink to="/seo" className={navClass} onClick={() => setMobileNavOpen(false)}>
          <Search className="size-4 shrink-0 opacity-70" aria-hidden />
          {t('nav.seo')}
        </NavLink>
        <NavLink to="/returns" className={navClass} onClick={() => setMobileNavOpen(false)}>
          <PackageOpen className="size-4 shrink-0 opacity-70" aria-hidden />
          {t('nav.returns')}
        </NavLink>
        <NavLink to="/niche" className={navClass} onClick={() => setMobileNavOpen(false)}>
          <BarChart3 className="size-4 shrink-0 opacity-70" aria-hidden />
          {t('nav.niche')}
        </NavLink>
      </nav>
      <div className="border-t border-sidebar-border p-3 md:hidden">
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => setMobileNavOpen(false)}
        >
          {t('nav.close_menu')}
        </Button>
      </div>
    </aside>
  )
}
