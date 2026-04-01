import { useTranslation } from '@/hooks/useTranslation'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type ToolKey = 'seo' | 'returns' | 'niche'

const titleKey: Record<ToolKey, string> = {
  seo: 'placeholder.seo_title',
  returns: 'placeholder.returns_title',
  niche: 'placeholder.niche_title',
}

const bodyKey: Record<ToolKey, string> = {
  seo: 'placeholder.seo_body',
  returns: 'placeholder.returns_body',
  niche: 'placeholder.niche_body',
}

export function PlaceholderToolPage({ tool }: { tool: ToolKey }) {
  const { t } = useTranslation()

  return (
    <Card className="border-dashed shadow-sm">
      <CardHeader>
        <CardTitle className="font-heading text-xl">{t(titleKey[tool])}</CardTitle>
        <CardDescription>{t('placeholder.coming_soon')}</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground max-w-lg text-sm leading-relaxed">
          {t(bodyKey[tool])}
        </p>
      </CardContent>
    </Card>
  )
}
