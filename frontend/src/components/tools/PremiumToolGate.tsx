import type { ReactNode } from 'react'

import { useTranslation } from '@/hooks/useTranslation'
import { cn } from '@/lib/utils'

type PremiumToolGateProps = {
  locked: boolean
  children: ReactNode
  className?: string
}

/**
 * When `locked` (e.g. free tier), blurs content and shows an upgrade hint.
 * Keeps layout stable for smoother responsive charts.
 */
export function PremiumToolGate({
  locked,
  children,
  className,
}: PremiumToolGateProps) {
  const { t } = useTranslation()
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
          <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
            {t('tools.premium_gate')}
          </p>
        </div>
      ) : null}
    </div>
  )
}
