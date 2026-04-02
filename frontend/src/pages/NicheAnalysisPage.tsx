import { useMemo, useState } from 'react'

import { useMutation } from '@tanstack/react-query'

import { postNicheAnalysis } from '@/api/ai'
import { ChartWrapper } from '@/components/charts/ChartWrapper'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { ToolErrorBoundary } from '@/components/tools/ToolErrorBoundary'
import { useLocaleFormat } from '@/hooks/useLocaleFormat'
import { useTranslation } from '@/hooks/useTranslation'
import {
  averagePriceFromTexts,
  buildCompetitorScatter,
  competitionDensityFromMatches,
  extractGapBullets,
} from '@/lib/nicheTransform'
import { useSessionStore } from '@/stores/sessionStore'
import {
  CartesianGrid,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts'

function textsFromMatches(matches: Record<string, unknown>[]): string[] {
  return matches.map((m) => {
    const payload = m.payload as Record<string, unknown> | undefined
    if (payload && typeof payload.text === 'string') return payload.text
    return ''
  }).filter(Boolean)
}

export function NicheAnalysisPage() {
  const { t } = useTranslation()
  const { formatCurrency } = useLocaleFormat()
  const token = useSessionStore((s) => s.token)
  const paid = useSessionStore((s) => s.tier) === 'paid'
  const [query, setQuery] = useState('')

  const mutation = useMutation({
    mutationFn: async (q: string) => {
      if (!token) throw new Error('Not signed in')
      return postNicheAnalysis(token, { query: q, limit: 15 })
    },
  })

  const texts = useMemo(
    () => textsFromMatches(mutation.data?.matches ?? []),
    [mutation.data?.matches],
  )

  const overview = useMemo(() => {
    const n = mutation.data?.matches?.length ?? 0
    const avg = averagePriceFromTexts(texts)
    return {
      count: n,
      avg,
      density: competitionDensityFromMatches(n),
    }
  }, [mutation.data?.matches, texts])

  const gaps = extractGapBullets(mutation.data?.summary ?? null)
  const scatter = useMemo(
    () => buildCompetitorScatter(query || 'niche', 14),
    [query],
  )

  return (
    <ToolErrorBoundary fallbackTitle={t('tools.error_boundary_title')}>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            {t('tools.niche_title')}
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            {t('tools.niche_subtitle')}
          </p>
        </div>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>{t('tools.niche_query_title')}</CardTitle>
            <CardDescription>{t('tools.niche_query_desc')}</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="grow space-y-2">
              <Label htmlFor="niche-q">{t('tools.niche_field_query')}</Label>
              <Input
                id="niche-q"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('tools.niche_placeholder')}
                disabled={!paid}
              />
            </div>
            <Button
              type="button"
              disabled={!paid || !query.trim() || mutation.isPending || !token}
              onClick={() => mutation.mutate(query.trim())}
            >
              {mutation.isPending ? t('tools.niche_running') : t('tools.niche_run')}
            </Button>
          </CardContent>
          {!paid ? (
            <CardContent className="pt-0">
              <p className="text-muted-foreground text-xs">{t('tools.niche_free_hint')}</p>
            </CardContent>
          ) : null}
        </Card>

        {mutation.isPending ? (
          <div data-testid="niche-loading" className="space-y-3" aria-busy="true">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : null}

        {mutation.isError ? (
          <Alert variant="destructive" data-testid="niche-error">
            <AlertTitle>{t('tools.niche_error_title')}</AlertTitle>
            <AlertDescription>{(mutation.error as Error).message}</AlertDescription>
          </Alert>
        ) : null}

        {mutation.data ? (
          <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      {t('tools.niche_metric_volume')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-heading text-2xl font-semibold tabular-nums">
                      {overview.count}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t('tools.niche_metric_volume_hint')}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      {t('tools.niche_metric_price')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-heading text-2xl font-semibold tabular-nums">
                      {overview.avg != null ? formatCurrency(overview.avg) : '—'}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t('tools.niche_metric_price_hint')}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      {t('tools.niche_metric_competition')}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-heading text-2xl font-semibold capitalize">
                      {t(`tools.niche_density_${overview.density}`)}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {t('tools.niche_metric_competition_hint')}
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Card>
                <CardHeader>
                  <CardTitle>{t('tools.niche_gap_title')}</CardTitle>
                  <CardDescription>{t('tools.niche_gap_desc')}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {gaps.length ? (
                    <ul className="list-inside list-disc space-y-1 text-sm">
                      {gaps.map((g) => (
                        <li key={g}>{g}</li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-muted-foreground text-sm">
                      {mutation.data.summary ?? t('tools.niche_gap_empty')}
                    </p>
                  )}
                </CardContent>
              </Card>

              <ChartWrapper
                title={t('tools.niche_scatter_title')}
                description={t('tools.niche_scatter_desc')}
              >
                <div className="h-[300px] w-full min-h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ScatterChart margin={{ top: 8, right: 16, bottom: 8, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                      <XAxis
                        type="number"
                        dataKey="price"
                        name={t('tools.niche_axis_price')}
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis
                        type="number"
                        dataKey="rating"
                        name={t('tools.niche_axis_rating')}
                        domain={[3, 5]}
                        tick={{ fontSize: 11 }}
                      />
                      <ZAxis type="number" dataKey="rating" range={[40, 400]} />
                      <Tooltip
                        cursor={{ strokeDasharray: '3 3' }}
                        formatter={(v: number, name: string) => [v.toFixed(2), name]}
                      />
                      <Scatter
                        name={t('tools.niche_competitors')}
                        data={scatter}
                        fill="hsl(var(--primary))"
                        isAnimationActive={false}
                      />
                    </ScatterChart>
                  </ResponsiveContainer>
                </div>
              </ChartWrapper>

              {mutation.data.summary ? (
                <Card>
                  <CardHeader>
                    <CardTitle>{t('tools.niche_summary_title')}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground whitespace-pre-wrap text-sm leading-relaxed">
                      {mutation.data.summary}
                    </p>
                  </CardContent>
                </Card>
              ) : null}
            </div>
        ) : null}
      </div>
    </ToolErrorBoundary>
  )
}
