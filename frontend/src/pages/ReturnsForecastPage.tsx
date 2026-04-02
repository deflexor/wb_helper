import { Fragment, useMemo, useState } from 'react'

import { useMutation, useQuery } from '@tanstack/react-query'

import { isQuotaExceededApiError, postAiChat } from '@/api/ai'
import { fetchMonitoringRows } from '@/api/monitoring'
import type { MonitoringRow } from '@/api/types'
import { ChartWrapper } from '@/components/charts/ChartWrapper'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ToolErrorBoundary } from '@/components/tools/ToolErrorBoundary'
import { PremiumToolGate } from '@/components/tools/PremiumToolGate'
import { useLocaleFormat } from '@/hooks/useLocaleFormat'
import { useTranslation } from '@/hooks/useTranslation'
import { formatQuotaResetAt, sanitizeUpgradeUrl } from '@/lib/quota'
import {
  buildReturnsHeatmap,
  buildReturnsTrendSeries,
  defaultHighRiskRows,
  parseReturnsInsightsJson,
  type ReturnsInsightRow,
} from '@/lib/returnsForecast'
import { useSessionStore } from '@/stores/sessionStore'
import { useUiStore } from '@/stores/uiStore'
import {
  Brush,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export function ReturnsForecastPage() {
  const { t } = useTranslation()
  const { formatPercent } = useLocaleFormat()
  const token = useSessionStore((s) => s.token)
  const quotaState = useUiStore((s) => s.quotaState)
  const setQuotaState = useUiStore((s) => s.setQuotaState)
  const clearQuotaState = useUiStore((s) => s.clearQuotaState)
  const setUsageState = useUiStore((s) => s.setUsageState)

  const query = useQuery({
    queryKey: ['monitoring', 'products'],
    queryFn: fetchMonitoringRows,
  })

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const products = useMemo(() => query.data ?? [], [query.data])
  const primary = products[0]
  const trendProductId = selectedId ?? primary?.id ?? 'demo'

  const trendData = useMemo(
    () => buildReturnsTrendSeries(trendProductId),
    [trendProductId],
  )

  const heatCells = useMemo(() => buildReturnsHeatmap(products), [products])

  const [aiRows, setAiRows] = useState<ReturnsInsightRow[] | null>(null)

  const insightsMutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Not signed in')
      const high = products.filter((p) => p.status === 'high_risk')
      const lines = high
        .map((p) => `- id=${p.id} name=${p.name}`)
        .join('\n')
      const content = `${t('tools.returns_ai_prompt')}\n${lines}`
      return postAiChat(token, {
        tool: 'returns',
        messages: [{ role: 'user', content }],
        context: { user: 'seller', competitor: 'returns' },
      })
    },
    onSuccess: (res) => {
      clearQuotaState()
      if (res.quota_usage) setUsageState(res.quota_usage)
      const parsed = parseReturnsInsightsJson(res.content)
      setAiRows(parsed)
    },
    onError: (error) => {
      if (isQuotaExceededApiError(error)) {
        setQuotaState(error.quota)
        setUsageState({ used: error.quota.used, limit: error.quota.limit })
      }
    },
  })
  const quotaLocked = quotaState != null
  const resetAtLabel = quotaState
    ? formatQuotaResetAt(quotaState.resets_at_utc, navigator.language)
    : null

  const displayRows = useMemo(() => {
    const base = defaultHighRiskRows(products)
    if (!aiRows?.length) return base
    const byId = new Map(aiRows.map((r) => [r.productId, r]))
    return base.map((row) => {
      const ai = byId.get(row.productId)
      if (!ai) return row
      return {
        ...row,
        reasons: ai.reasons.length ? ai.reasons : row.reasons,
        recommendations: ai.recommendations.length
          ? ai.recommendations
          : row.recommendations,
      }
    })
  }, [products, aiRows])

  const maxHeat = useMemo(
    () => Math.max(0.05, ...heatCells.map((c) => c.intensity)),
    [heatCells],
  )

  return (
    <ToolErrorBoundary fallbackTitle={t('tools.error_boundary_title')}>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            {t('tools.returns_title')}
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            {t('tools.returns_subtitle')}
          </p>
        </div>

        <ChartWrapper
          title={t('tools.returns_chart_title')}
          description={t('tools.returns_chart_desc')}
        >
          <div data-testid="returns-risk-chart" className="h-[280px] w-full min-h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={trendData}
                margin={{ top: 8, right: 16, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" className="stroke-border/60" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis
                  tickFormatter={(v) => formatPercent(Number(v))}
                  width={48}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip
                  formatter={(v: number) => [formatPercent(v), t('tools.returns_rate')]}
                  labelFormatter={(l) => `${t('tools.returns_week')} ${l}`}
                />
                <Line
                  type="monotone"
                  dataKey="rate"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={false}
                  isAnimationActive={false}
                />
                <Brush dataKey="label" height={22} stroke="hsl(var(--border))" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </ChartWrapper>

        <PremiumToolGate locked={quotaLocked} quotaExceeded={quotaState}>
          <div className="space-y-6">
            <Card className="border-border/80 shadow-sm">
              <CardHeader>
                <CardTitle>{t('tools.returns_heatmap_title')}</CardTitle>
                <CardDescription>{t('tools.returns_heatmap_desc')}</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <div
                  className="grid gap-1"
                  style={{
                    gridTemplateColumns: `minmax(140px,1fr) repeat(${6}, minmax(36px,1fr))`,
                  }}
                >
                  <div />
                  {['W1', 'W2', 'W3', 'W4', 'W5', 'W6'].map((w) => (
                    <div
                      key={w}
                      className="text-muted-foreground text-center text-[10px] font-medium"
                    >
                      {w}
                    </div>
                  ))}
                  {products.slice(0, 6).map((p) => (
                    <Fragment key={p.id}>
                      <div className="truncate py-1 text-xs font-medium" title={p.name}>
                        {p.name}
                      </div>
                      {['W1', 'W2', 'W3', 'W4', 'W5', 'W6'].map((w) => {
                        const cell = heatCells.find(
                          (c) => c.row === p.name.slice(0, 24) && c.col === w,
                        )
                        const int = cell?.intensity ?? 0
                        const alpha = 0.15 + (int / maxHeat) * 0.75
                        return (
                          <div
                            key={`${p.id}-${w}`}
                            className="h-8 rounded-sm border border-border/40"
                            style={{
                              backgroundColor: `hsl(var(--primary) / ${alpha.toFixed(2)})`,
                            }}
                            title={t('tools.returns_cell_hint', {
                              product: p.name,
                              week: w,
                            })}
                          />
                        )
                      })}
                    </Fragment>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-heading text-lg font-semibold">
                {t('tools.returns_high_risk')}
              </h2>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                disabled={quotaLocked || insightsMutation.isPending || !token}
                onClick={() => insightsMutation.mutate()}
              >
                {insightsMutation.isPending
                  ? t('tools.returns_ai_loading')
                  : t('tools.returns_ai_refresh')}
              </Button>
            </div>
            {quotaLocked ? (
              <div>
                <p className="text-muted-foreground text-xs">{t('tools.quota_exhausted_gate')}</p>
                <a
                  href={sanitizeUpgradeUrl(quotaState.upgrade_url)}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary mt-1 inline-block text-xs font-medium underline underline-offset-4"
                >
                  {t('tools.upgrade_cta')}
                </a>
                {resetAtLabel ? (
                  <p className="text-muted-foreground mt-1 text-xs">
                    {t('tools.quota_resets_at', { time: resetAtLabel })}
                  </p>
                ) : null}
              </div>
            ) : null}

            <Card className="border-border/80 shadow-sm">
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>{t('tools.returns_col_product')}</TableHead>
                      <TableHead>{t('tools.returns_col_reasons')}</TableHead>
                      <TableHead>{t('tools.returns_col_actions')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayRows.map((row) => (
                      <TableRow key={row.productId}>
                        <TableCell className="max-w-[200px] font-medium">
                          {row.productName}
                        </TableCell>
                        <TableCell>
                          <ul className="text-muted-foreground list-inside list-disc text-sm">
                            {row.reasons.map((r) => (
                              <li key={r}>{r}</li>
                            ))}
                          </ul>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            {row.recommendations.map((r) => (
                              <Badge key={r} variant="secondary" className="w-fit font-normal">
                                {r}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              <span className="text-muted-foreground text-xs">{t('tools.returns_pick_series')}</span>
              {products.map((p: MonitoringRow) => (
                <Button
                  key={p.id}
                  type="button"
                  size="sm"
                  variant={trendProductId === p.id ? 'default' : 'outline'}
                  onClick={() => setSelectedId(p.id)}
                >
                  {p.name}
                </Button>
              ))}
            </div>
          </div>
        </PremiumToolGate>
      </div>
    </ToolErrorBoundary>
  )
}
