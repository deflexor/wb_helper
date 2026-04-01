import { Menu } from 'lucide-react'

import { AppSidebar } from '@/components/layout/AppSidebar'
import { useTranslation } from '@/hooks/useTranslation'
import { useUiStore } from '@/stores/uiStore'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog'

export function MobileNavSheet() {
  const { t } = useTranslation()
  const open = useUiStore((s) => s.mobileNavOpen)
  const setOpen = useUiStore((s) => s.setMobileNavOpen)

  return (
    <>
      <div className="bg-background/80 supports-backdrop-filter:backdrop-blur-xs fixed top-0 right-0 left-0 z-30 flex h-14 items-center justify-between border-b px-4 md:hidden">
        <span className="font-heading text-sm font-semibold">{t('app_name')}</span>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          aria-label={t('nav.open_menu')}
          onClick={() => setOpen(true)}
        >
          <Menu className="size-4" />
        </Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent
          showCloseButton
          className="!fixed !inset-0 !top-0 !left-0 z-50 flex h-svh max-h-svh w-full max-w-none !translate-x-0 !translate-y-0 flex-col gap-0 rounded-none border-0 p-0 shadow-none sm:max-w-none"
        >
          <DialogTitle className="sr-only">{t('nav.main_label')}</DialogTitle>
          <div className="flex h-full flex-col">
            <AppSidebar className="relative flex w-full border-0 shadow-none" />
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
