import { useMemo, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'

import type { MonitoringRow } from '@/api/types'
import { useLocaleFormat } from '@/hooks/useLocaleFormat'
import { useMonitoringProducts } from '@/hooks/useMonitoringProducts'
import { useTranslation } from '@/hooks/useTranslation'
import { useUiStore } from '@/stores/uiStore'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

type SortKey = 'name' | 'currentPrice' | 'competitorPrice' | 'gapFraction'

function SortHeaderIcon({
  active,
  dir,
}: {
  active: boolean
  dir: 'asc' | 'desc'
}) {
  if (!active) return null
  return dir === 'asc' ? (
    <ArrowUp className="size-3.5 opacity-60" aria-hidden />
  ) : (
    <ArrowDown className="size-3.5 opacity-60" aria-hidden />
  )
}

function sortRows(
  rows: MonitoringRow[],
  key: SortKey,
  dir: 'asc' | 'desc',
): MonitoringRow[] {
  const mul = dir === 'asc' ? 1 : -1
  return [...rows].sort((a, b) => {
    const av = a[key]
    const bv = b[key]
    if (typeof av === 'string' && typeof bv === 'string') {
      return av.localeCompare(bv) * mul
    }
    return ((av as number) - (bv as number)) * mul
  })
}

export function MonitoringPage() {
  const { t } = useTranslation()
  const { formatCurrency, formatPercent, formatDate } = useLocaleFormat()
  const search = useUiStore((s) => s.monitoringSearch)
  const setSearch = useUiStore((s) => s.setMonitoringSearch)
  const risk = useUiStore((s) => s.monitoringRiskFilter)
  const setRisk = useUiStore((s) => s.setMonitoringRiskFilter)
  const [sortKey, setSortKey] = useState<SortKey>('gapFraction')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const query = useMonitoringProducts()

  const filteredSorted = useMemo(() => {
    if (!query.data) return []
    let rows = query.data.filter((r) =>
      r.name.toLowerCase().includes(search.trim().toLowerCase()),
    )
    if (risk === 'high') rows = rows.filter((r) => r.status === 'high_risk')
    if (risk === 'optimal') rows = rows.filter((r) => r.status === 'optimal')
    return sortRows(rows, sortKey, sortDir)
  }, [query.data, search, risk, sortKey, sortDir])

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortKey(key)
      setSortDir(key === 'name' ? 'asc' : 'desc')
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          {t('monitoring.title')}
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          {t('monitoring.subtitle')}
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          className="max-w-md"
          placeholder={t('monitoring.filter_search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          aria-label={t('monitoring.filter_search')}
        />
        <Select
          value={risk}
          onValueChange={(v) => {
            if (v === 'all' || v === 'high' || v === 'optimal') setRisk(v)
          }}
        >
          <SelectTrigger className="w-full sm:w-[200px]" size="sm">
            <SelectValue placeholder={t('monitoring.filter_risk')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('monitoring.risk_all')}</SelectItem>
            <SelectItem value="high">{t('monitoring.risk_high')}</SelectItem>
            <SelectItem value="optimal">{t('monitoring.risk_optimal')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {query.isError ? (
        <Alert variant="destructive">
          <AlertTitle>{t('monitoring.error_title')}</AlertTitle>
          <AlertDescription>{t('monitoring.error_body')}</AlertDescription>
        </Alert>
      ) : null}

      {query.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      ) : null}

      {query.isSuccess && filteredSorted.length === 0 ? (
        <Card className="border-dashed shadow-sm">
          <CardContent className="text-muted-foreground flex flex-col items-center justify-center py-16 text-center text-sm">
            <p className="font-medium text-foreground">{t('monitoring.empty_title')}</p>
            <p className="mt-1 max-w-sm">{t('monitoring.empty_body')}</p>
          </CardContent>
        </Card>
      ) : null}

      {query.isSuccess && filteredSorted.length > 0 ? (
        <>
          <div className="hidden overflow-x-auto rounded-xl border shadow-sm md:block">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-14">{t('monitoring.col_image')}</TableHead>
                  <TableHead>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="-ml-2 gap-1 font-medium"
                      onClick={() => toggleSort('name')}
                    >
                      {t('monitoring.col_name')}
                      <SortHeaderIcon active={sortKey === 'name'} dir={sortDir} />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="-mr-2 ml-auto gap-1 font-medium"
                      onClick={() => toggleSort('currentPrice')}
                    >
                      {t('monitoring.col_your_price')}
                      <SortHeaderIcon
                        active={sortKey === 'currentPrice'}
                        dir={sortDir}
                      />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="-mr-2 ml-auto gap-1 font-medium"
                      onClick={() => toggleSort('competitorPrice')}
                    >
                      {t('monitoring.col_competitor')}
                      <SortHeaderIcon
                        active={sortKey === 'competitorPrice'}
                        dir={sortDir}
                      />
                    </Button>
                  </TableHead>
                  <TableHead className="text-right">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="-mr-2 ml-auto gap-1 font-medium"
                      onClick={() => toggleSort('gapFraction')}
                    >
                      {t('monitoring.col_gap')}
                      <SortHeaderIcon
                        active={sortKey === 'gapFraction'}
                        dir={sortDir}
                      />
                    </Button>
                  </TableHead>
                  <TableHead>{t('monitoring.col_status')}</TableHead>
                  <TableHead className="text-right">
                    {t('monitoring.col_action')}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSorted.map((row) => (
                  <TableRow
                    key={row.id}
                    className="transition-colors hover:bg-muted/40"
                  >
                    <TableCell>
                      <img
                        src={row.imageUrl}
                        alt=""
                        className="size-10 rounded-md object-cover ring-1 ring-border"
                        loading="lazy"
                      />
                    </TableCell>
                    <TableCell className="max-w-[200px] font-medium">
                      {row.name}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.currentPrice)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatCurrency(row.competitorPrice)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        'text-right tabular-nums',
                        row.gapFraction > 0.05
                          ? 'text-destructive'
                          : row.gapFraction < -0.02
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : '',
                      )}
                    >
                      {formatPercent(row.gapFraction)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.status === 'high_risk' ? 'destructive' : 'secondary'
                        }
                      >
                        {row.status === 'high_risk'
                          ? t('monitoring.badge_high_risk')
                          : t('monitoring.badge_optimal')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button type="button" size="sm" variant="outline">
                        {t('monitoring.action_details')}
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="grid gap-3 md:hidden">
            {filteredSorted.map((row) => (
              <Card
                key={row.id}
                className="overflow-hidden shadow-sm transition-shadow hover:shadow-md"
              >
                <CardContent className="flex gap-3 p-4">
                  <img
                    src={row.imageUrl}
                    alt=""
                    className="size-14 shrink-0 rounded-lg object-cover ring-1 ring-border"
                    loading="lazy"
                  />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium leading-snug">{row.name}</p>
                      <Badge
                        variant={
                          row.status === 'high_risk' ? 'destructive' : 'secondary'
                        }
                        className="shrink-0"
                      >
                        {row.status === 'high_risk'
                          ? t('monitoring.badge_high_risk')
                          : t('monitoring.badge_optimal')}
                      </Badge>
                    </div>
                    <dl className="text-muted-foreground grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                      <dt>{t('monitoring.col_your_price')}</dt>
                      <dd className="text-foreground text-right tabular-nums">
                        {formatCurrency(row.currentPrice)}
                      </dd>
                      <dt>{t('monitoring.col_competitor')}</dt>
                      <dd className="text-foreground text-right tabular-nums">
                        {formatCurrency(row.competitorPrice)}
                      </dd>
                      <dt>{t('monitoring.col_gap')}</dt>
                      <dd className="text-right tabular-nums text-foreground">
                        {formatPercent(row.gapFraction)}
                      </dd>
                    </dl>
                    <Button type="button" size="sm" variant="secondary" className="w-full">
                      {t('monitoring.action_details')}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredSorted[0] ? (
            <p className="text-muted-foreground text-xs">
              {t('monitoring.footer_updated', {
                date: formatDate(new Date(filteredSorted[0].updatedAt)),
              })}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
