import type { ReactNode } from 'react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type ChartWrapperProps = {
  title: string
  description?: string
  children: ReactNode
  className?: string
  /** Minimum height for responsive chart area */
  chartMinHeight?: number
}

export function ChartWrapper({
  title,
  description,
  children,
  className,
  chartMinHeight = 280,
}: ChartWrapperProps) {
  return (
    <Card className={cn('border-border/80 shadow-sm', className)}>
      <CardHeader className="pb-2">
        <CardTitle className="font-heading text-base">{title}</CardTitle>
        {description ? (
          <p className="text-muted-foreground text-sm">{description}</p>
        ) : null}
      </CardHeader>
      <CardContent
        className="pt-0"
        style={{ minHeight: chartMinHeight }}
      >
        {children}
      </CardContent>
    </Card>
  )
}
