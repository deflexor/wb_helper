import { useLocation, useNavigate } from 'react-router-dom'
import { ChevronDown, UserRound } from 'lucide-react'

import { useTranslation } from '@/hooks/useTranslation'
import { formatQuotaResetAt, sanitizeUpgradeUrl } from '@/lib/quota'
import { useSessionStore } from '@/stores/sessionStore'
import { useUiStore } from '@/stores/uiStore'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { buttonVariants } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

const pathKeyMap: Record<string, string> = {
  '/monitoring': 'breadcrumb.monitoring',
  '/pricing': 'breadcrumb.pricing',
  '/seo': 'breadcrumb.seo',
  '/returns': 'breadcrumb.returns',
  '/niche': 'breadcrumb.niche',
}

export function AppTopBar() {
  const { t } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const tier = useSessionStore((s) => s.tier)
  const clearSession = useSessionStore((s) => s.clearSession)
  const language = useUiStore((s) => s.language)
  const setLanguage = useUiStore((s) => s.setLanguage)
  const quotaState = useUiStore((s) => s.quotaState)
  const usageState = useUiStore((s) => s.usageState)
  const clearQuotaState = useUiStore((s) => s.clearQuotaState)
  const clearUsageState = useUiStore((s) => s.clearUsageState)

  const crumbKey = pathKeyMap[location.pathname] ?? 'breadcrumb.dashboard'

  const resetAtLabel = quotaState
    ? formatQuotaResetAt(quotaState.resets_at_utc, navigator.language)
    : null

  return (
    <header className="bg-card/40 supports-backdrop-filter:backdrop-blur-xs sticky top-0 z-20 border-b">
      <div className="flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-6 lg:px-8">
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink to="/monitoring">{t('breadcrumb.app')}</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>{t(crumbKey)}</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-muted-foreground border-border bg-muted/40 rounded-lg border px-2.5 py-1 text-xs font-medium">
            {quotaState
              ? t('usage.label', {
                  used: quotaState.used,
                  limit: quotaState.limit,
                })
              : usageState
                ? t('usage.label', {
                    used: usageState.used,
                    limit: usageState.limit,
                  })
              : t('usage.placeholder')}
          </span>
          {quotaState ? (
            <>
              <a
                href={sanitizeUpgradeUrl(quotaState.upgrade_url)}
                target="_blank"
                rel="noreferrer"
                className={cn(buttonVariants({ variant: 'default', size: 'sm' }))}
              >
                {t('usage.upgrade_cta')}
              </a>
              {resetAtLabel ? (
                <span className="text-muted-foreground text-xs">
                  {t('usage.resets_at', { time: resetAtLabel })}
                </span>
              ) : null}
            </>
          ) : null}
          <span
            className={cn(
              buttonVariants({ variant: 'secondary', size: 'sm' }),
              'pointer-events-none border border-border',
            )}
          >
            {tier === 'paid'
              ? t('subscription.paid')
              : t('subscription.free')}
          </span>

          <DropdownMenu>
            <DropdownMenuTrigger
              type="button"
              className={cn(
                buttonVariants({ variant: 'outline', size: 'sm' }),
                'gap-2',
              )}
            >
              <UserRound className="size-4 opacity-70" aria-hidden />
              {t('profile.menu_trigger')}
              <ChevronDown className="size-3.5 opacity-50" aria-hidden />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  {t('profile.section_account')}
                </DropdownMenuLabel>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger inset>
                  {t('profile.language')}
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuRadioGroup
                    value={language}
                    onValueChange={(v) => {
                      if (v === 'en' || v === 'ru') setLanguage(v)
                    }}
                  >
                    <DropdownMenuRadioItem
                      value="en"
                      data-testid="language-option-en"
                    >
                      {t('locale_en')}
                    </DropdownMenuRadioItem>
                    <DropdownMenuRadioItem
                      value="ru"
                      data-testid="language-option-ru"
                    >
                      {t('locale_ru')}
                    </DropdownMenuRadioItem>
                  </DropdownMenuRadioGroup>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/monitoring')}>
                {t('profile.link_dashboard')}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  clearSession()
                  clearQuotaState()
                  clearUsageState()
                  navigate('/login', { replace: true })
                }}
              >
                {t('menu_sign_out')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
