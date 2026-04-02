import { useMemo, useState } from 'react'

import { useMutation } from '@tanstack/react-query'

import { isQuotaExceededApiError, postAiChat } from '@/api/ai'
import { MONITORING_SAMPLE_PRODUCTS } from '@/api/monitoring'
import type { MonitoringRow } from '@/api/types'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { PremiumToolGate } from '@/components/tools/PremiumToolGate'
import { ToolErrorBoundary } from '@/components/tools/ToolErrorBoundary'
import { useTranslation } from '@/hooks/useTranslation'
import { formatQuotaResetAt, sanitizeUpgradeUrl } from '@/lib/quota'
import {
  estimateUsdFromUsage,
  parseSeoJsonFromModel,
  roughTokenEstimateFromText,
  type SeoContent,
} from '@/lib/seoGeneration'
import { useSessionStore } from '@/stores/sessionStore'
import { useUiStore } from '@/stores/uiStore'

function productDefaults(p: MonitoringRow): SeoContent {
  return {
    title: `${p.name} — marketplace listing`,
    description: `Buy ${p.name}. Quality offer with competitive pricing and fast fulfillment.`,
    keywords: [p.name.toLowerCase().split(' ')[0] ?? 'product', 'marketplace', 'delivery'],
  }
}

export function SeoContentPage() {
  const { t } = useTranslation()
  const token = useSessionStore((s) => s.token)
  const quotaState = useUiStore((s) => s.quotaState)
  const setQuotaState = useUiStore((s) => s.setQuotaState)
  const clearQuotaState = useUiStore((s) => s.clearQuotaState)
  const setUsageState = useUiStore((s) => s.setUsageState)

  const [productId, setProductId] = useState(MONITORING_SAMPLE_PRODUCTS[0]?.id ?? '')
  const selected = useMemo(
    () => MONITORING_SAMPLE_PRODUCTS.find((p) => p.id === productId),
    [productId],
  )

  const [original, setOriginal] = useState<SeoContent>(() =>
    productDefaults(MONITORING_SAMPLE_PRODUCTS[0] ?? {
      id: 'x',
      name: 'Product',
      imageUrl: '',
      currentPrice: 0,
      competitorPrice: 0,
      gapFraction: 0,
      status: 'optimal',
      updatedAt: new Date().toISOString(),
    }),
  )
  const [generated, setGenerated] = useState<SeoContent | null>(null)
  const [parseError, setParseError] = useState<string | null>(null)
  const [savedHint, setSavedHint] = useState<string | null>(null)

  const mutation = useMutation({
    mutationFn: async () => {
      if (!token) throw new Error('Not signed in')
      if (!selected) throw new Error('No product')
      const userMsg =
        `${t('tools.seo_ai_instruction')}\n` +
        `Product: ${selected.name}\n` +
        `Current title: ${original.title}\n` +
        `Current description: ${original.description}\n` +
        `Current keywords: ${original.keywords.join(', ')}`
      return postAiChat(token, {
        tool: 'seo',
        messages: [{ role: 'user', content: userMsg }],
        context: { user: 'seller', competitor: selected.name },
      })
    },
    onSuccess: (res) => {
      clearQuotaState()
      if (res.quota_usage) setUsageState(res.quota_usage)
      const parsed = parseSeoJsonFromModel(res.content)
      if (!parsed) {
        setParseError(t('tools.seo_parse_error'))
        setGenerated(null)
        return
      }
      setParseError(null)
      setGenerated(parsed)
    },
    onError: (error) => {
      if (isQuotaExceededApiError(error)) {
        setQuotaState(error.quota)
        setUsageState({ used: error.quota.used, limit: error.quota.limit })
      }
    },
  })

  function applyProductSelection(id: string | null) {
    if (!id) return
    setProductId(id)
    const p = MONITORING_SAMPLE_PRODUCTS.find((x) => x.id === id)
    if (p) {
      setOriginal(productDefaults(p))
      setGenerated(null)
      setParseError(null)
    }
  }

  async function copyField(label: string, value: string) {
    await navigator.clipboard.writeText(value)
    setSavedHint(t('tools.copied', { label }))
    setTimeout(() => setSavedHint(null), 2000)
  }

  function saveToProduct() {
    if (!generated) return
    setOriginal(generated)
    setSavedHint(t('tools.seo_saved_local'))
    setTimeout(() => setSavedHint(null), 2500)
  }

  const usage = mutation.data?.usage ?? null
  const usd = estimateUsdFromUsage(usage)
  const estTokens =
    usage?.total_tokens ??
    (mutation.data?.content
      ? roughTokenEstimateFromText(mutation.data.content)
      : null)

  const quotaLocked = quotaState != null
  const resetAtLabel = quotaState
    ? formatQuotaResetAt(quotaState.resets_at_utc, navigator.language)
    : null

  return (
    <ToolErrorBoundary fallbackTitle={t('tools.error_boundary_title')}>
      <div className="space-y-6">
        <div>
          <h1 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            {t('tools.seo_title')}
          </h1>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm">
            {t('tools.seo_subtitle')}
          </p>
        </div>

        {savedHint ? (
          <p className="text-muted-foreground text-sm" role="status">
            {savedHint}
          </p>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle>{t('tools.seo_input_title')}</CardTitle>
              <CardDescription>{t('tools.seo_input_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>{t('tools.seo_product')}</Label>
                <Select value={productId} onValueChange={applyProductSelection}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONITORING_SAMPLE_PRODUCTS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="seo-orig-title">{t('tools.seo_field_title')}</Label>
                <Input
                  id="seo-orig-title"
                  value={original.title}
                  onChange={(e) =>
                    setOriginal((o) => ({ ...o, title: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seo-orig-desc">{t('tools.seo_field_description')}</Label>
                <textarea
                  id="seo-orig-desc"
                  className="border-input bg-background ring-offset-background placeholder:text-muted-foreground focus-visible:ring-ring flex min-h-28 w-full rounded-md border px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none"
                  value={original.description}
                  onChange={(e) =>
                    setOriginal((o) => ({ ...o, description: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="seo-orig-kw">{t('tools.seo_field_keywords')}</Label>
                <Input
                  id="seo-orig-kw"
                  value={original.keywords.join(', ')}
                  onChange={(e) =>
                    setOriginal((o) => ({
                      ...o,
                      keywords: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    }))
                  }
                />
              </div>
              <Button
                type="button"
                disabled={quotaLocked || mutation.isPending || !token}
                onClick={() => mutation.mutate()}
              >
                {mutation.isPending ? t('tools.generating') : t('tools.seo_generate')}
              </Button>
              {quotaLocked ? (
                <div>
                  <a
                    href={sanitizeUpgradeUrl(quotaState.upgrade_url)}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary inline-block text-xs font-medium underline underline-offset-4"
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
              {mutation.isError ? (
                <p className="text-destructive text-sm">
                  {(mutation.error as Error).message}
                </p>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border-border/80 shadow-sm">
            <CardHeader>
              <CardTitle>{t('tools.seo_compare_title')}</CardTitle>
              <CardDescription>{t('tools.seo_compare_desc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <PremiumToolGate locked={quotaLocked} quotaExceeded={quotaState}>
                <div className="space-y-4">
                  {parseError ? (
                    <p className="text-destructive text-sm">{parseError}</p>
                  ) : null}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        {t('tools.seo_col_original')}
                      </span>
                      <p className="text-sm font-medium">{original.title}</p>
                      <p className="text-muted-foreground text-sm">{original.description}</p>
                      <p className="text-xs">{original.keywords.join(', ')}</p>
                    </div>
                    <div className="space-y-2">
                      <span className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
                        {t('tools.seo_col_generated')}
                      </span>
                      {generated ? (
                        <>
                          <p className="text-sm font-medium">{generated.title}</p>
                          <p
                            className="text-muted-foreground text-sm"
                            data-testid="seo-generated-description"
                          >
                            {generated.description}
                          </p>
                          <p className="text-xs" data-testid="seo-generated-keywords">
                            {generated.keywords.join(', ')}
                          </p>
                        </>
                      ) : (
                        <p className="text-muted-foreground text-sm">
                          {t('tools.seo_generated_placeholder')}
                        </p>
                      )}
                    </div>
                  </div>
                  {generated ? (
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => void copyField('description', generated.description)}
                      >
                        {t('tools.copy_description')}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          void copyField('keywords', generated.keywords.join(', '))
                        }
                      >
                        {t('tools.copy_keywords')}
                      </Button>
                      <Button type="button" size="sm" onClick={saveToProduct}>
                        {t('tools.save_to_product')}
                      </Button>
                    </div>
                  ) : null}
                </div>
              </PremiumToolGate>

              <div className="border-border bg-muted/30 rounded-lg border p-3 text-xs">
                <p className="text-muted-foreground font-medium">
                  {t('tools.token_usage_title')}
                </p>
                <p className="tabular-nums">
                  {usage
                    ? t('tools.token_usage_detail', {
                        prompt: usage.prompt_tokens,
                        completion: usage.completion_tokens,
                        total: usage.total_tokens,
                      })
                    : estTokens
                      ? t('tools.token_estimate_only', { tokens: estTokens })
                      : t('tools.token_usage_empty')}
                </p>
                {usd != null ? (
                  <p className="text-muted-foreground mt-1">
                    {t('tools.cost_estimate', { amount: usd.toFixed(4) })}
                  </p>
                ) : null}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </ToolErrorBoundary>
  )
}
