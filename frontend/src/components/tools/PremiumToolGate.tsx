import type { ReactNode } from 'react'

import type { QuotaExceededError } from '@/api/types'
import { useTranslation } from '@/hooks/useTranslation'
import { formatQuotaResetAt, sanitizeUpgradeUrl } from '@/lib/quota'
import { cn } from '@/lib/utils'

type PremiumToolGateProps = {
  locked: boolean
  children: ReactNode
  className?: string
  quotaExceeded?: QuotaExceededError | null
}

/**
 * When `locked` (e.g. free tier), blurs content and shows an upgrade hint.
 * Keeps layout stable for smoother responsive charts.
 */
export function PremiumToolGate({
  locked,
  children,
  className,
  quotaExceeded,
}: PremiumToolGateProps) {
  const { t } = useTranslation()
  const resetAtLabel = quotaExceeded
    ? formatQuotaResetAt(quotaExceeded.resets_at_utc, navigator.language)
    : null
  return (
    <div className={cn('relative', className)}>
      <div
        className={cn(locked && 'pointer-events-none select-none blur-sm')}
        aria-hidden={locked}
      >
        {children}
      </div>
      {locked ? (
        <div className="bg-background/70 absolute inset-0 flex items-center justify-center rounded-lg border border-dashed border-border p-4 text-center">
          <div className="space-y-3">
            <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
              {quotaExceeded ? t('tools.quota_exhausted_gate') : t('tools.premium_gate')}
            </p>
            {quotaExceeded ? (
              <>
                <a
                  href={sanitizeUpgradeUrl(quotaExceeded.upgrade_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary text-sm font-medium underline underline-offset-4"
                >
                  {t('tools.upgrade_cta')}
                </a>
                {resetAtLabel ? (
                  <p className="text-muted-foreground text-xs">
                    {t('tools.quota_resets_at', { time: resetAtLabel })}
                  </p>
                ) : null}
              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
