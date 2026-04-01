import { useMemo, useState } from 'react'

import { useLocaleFormat } from '@/hooks/useLocaleFormat'
import { useTranslation } from '@/hooks/useTranslation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Slider } from '@/components/ui/slider'

export function PricingOptimizationPage() {
  const { t } = useTranslation()
  const { formatCurrency } = useLocaleFormat()
  const [sku, setSku] = useState('')
  const [strategy, setStrategy] = useState<'match' | 'undercut' | 'premium'>(
    'match',
  )
  const [adjustPct, setAdjustPct] = useState(0)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const basePrice = 2490
  const unitCost = 1500

  const preview = useMemo(() => {
    const strategyMul =
      strategy === 'undercut' ? 0.98 : strategy === 'premium' ? 1.05 : 1
    const newPrice = Math.round(basePrice * strategyMul * (1 + adjustPct / 100))
    const profitBefore = basePrice - unitCost
    const profitAfter = newPrice - unitCost
    const delta = profitAfter - profitBefore
    return { newPrice, profitBefore, profitAfter, delta }
  }, [strategy, adjustPct])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          {t('pricing.title')}
        </h1>
        <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
          {t('pricing.subtitle')}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="border-border/80 shadow-sm transition-shadow hover:shadow-md lg:col-span-3">
          <CardHeader>
            <CardTitle>{t('pricing.form_title')}</CardTitle>
            <CardDescription>{t('pricing.form_description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="sku">{t('pricing.field_sku')}</Label>
              <Input
                id="sku"
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                placeholder={t('pricing.field_sku_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('pricing.field_strategy')}</Label>
              <Select
                value={strategy}
                onValueChange={(v) => {
                  if (v === 'match' || v === 'undercut' || v === 'premium') {
                    setStrategy(v)
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="match">{t('pricing.strategy_match')}</SelectItem>
                  <SelectItem value="undercut">
                    {t('pricing.strategy_undercut')}
                  </SelectItem>
                  <SelectItem value="premium">
                    {t('pricing.strategy_premium')}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-4">
                <Label htmlFor="adj">{t('pricing.field_adjust')}</Label>
                <span className="text-muted-foreground text-sm tabular-nums">
                  {adjustPct > 0 ? '+' : ''}
                  {adjustPct}%
                </span>
              </div>
              <Slider
                id="adj"
                min={-15}
                max={20}
                step={1}
                value={adjustPct}
                onValueChange={(v) =>
                  setAdjustPct(typeof v === 'number' ? v : v[0] ?? 0)
                }
                aria-label={t('pricing.field_adjust')}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="button" onClick={() => setConfirmOpen(true)}>
              {t('pricing.apply_open')}
            </Button>
          </CardFooter>
        </Card>

        <Card className="from-muted/40 border-border/80 bg-gradient-to-b to-card shadow-sm lg:col-span-2">
          <CardHeader>
            <CardTitle>{t('pricing.preview_title')}</CardTitle>
            <CardDescription>{t('pricing.preview_hint')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex justify-between gap-4 border-b border-border/60 pb-3">
              <span className="text-muted-foreground">
                {t('pricing.preview_current')}
              </span>
              <span className="font-medium tabular-nums">
                {formatCurrency(basePrice)}
              </span>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/60 pb-3">
              <span className="text-muted-foreground">
                {t('pricing.preview_new')}
              </span>
              <span className="text-primary font-heading text-lg font-semibold tabular-nums">
                {formatCurrency(preview.newPrice)}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-muted-foreground">
                {t('pricing.preview_profit_delta')}
              </span>
              <span
                className={
                  preview.delta >= 0
                    ? 'font-medium text-emerald-600 tabular-nums dark:text-emerald-400'
                    : 'text-destructive font-medium tabular-nums'
                }
              >
                {preview.delta >= 0 ? '+' : ''}
                {formatCurrency(preview.delta)}
              </span>
            </div>
            <p className="text-muted-foreground text-xs leading-relaxed">
              {t('pricing.preview_footnote')}
            </p>
          </CardContent>
        </Card>
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>{t('pricing.confirm_title')}</DialogTitle>
            <DialogDescription>{t('pricing.confirm_body')}</DialogDescription>
          </DialogHeader>
          <ul className="text-muted-foreground list-inside list-disc space-y-1 text-sm">
            <li>
              {t('pricing.confirm_line_price', {
                price: formatCurrency(preview.newPrice),
              })}
            </li>
            <li>
              {t('pricing.confirm_line_profit', {
                amount: formatCurrency(preview.delta),
              })}
            </li>
          </ul>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
            >
              {t('pricing.confirm_cancel')}
            </Button>
            <Button
              type="button"
              onClick={() => setConfirmOpen(false)}
            >
              {t('pricing.confirm_apply')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
