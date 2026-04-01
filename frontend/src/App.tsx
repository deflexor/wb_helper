import { useTranslation } from '@/hooks/useTranslation'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useDemoStore } from '@/stores/demoStore'
import { cn } from '@/lib/utils'
import { MoreHorizontal } from 'lucide-react'

export default function App() {
  const { t, i18n } = useTranslation()
  const count = useDemoStore((s) => s.count)
  const increment = useDemoStore((s) => s.increment)

  return (
    <div className="mx-auto flex min-h-svh max-w-5xl flex-col gap-6 p-6 text-left">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-muted-foreground text-sm">{t('app_name')}</p>
          <h1 className="font-heading text-3xl font-semibold tracking-tight">
            {t('welcome_title')}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={i18n.language.startsWith('ru') ? 'ru' : 'en'}
            onValueChange={(value) => {
              if (value) void i18n.changeLanguage(value)
            }}
          >
            <SelectTrigger
              size="sm"
              className="w-[140px]"
              aria-label={t('language_label')}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="en">{t('locale_en')}</SelectItem>
              <SelectItem value="ru">{t('locale_ru')}</SelectItem>
            </SelectContent>
          </Select>
          <Badge variant="secondary">{t('badge_beta')}</Badge>
          <DropdownMenu>
            <DropdownMenuTrigger
              type="button"
              aria-label={t('action_menu')}
              className={cn(buttonVariants({ variant: 'outline', size: 'icon' }))}
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>{t('menu_settings')}</DropdownMenuItem>
              <DropdownMenuItem>{t('menu_sign_out')}</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Alert>
        <AlertTitle>{t('alert_setup_title')}</AlertTitle>
        <AlertDescription>{t('alert_setup_body')}</AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>{t('welcome_title')}</CardTitle>
          <CardDescription>{t('welcome_message')}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder={t('input_search_placeholder')} />
          <div className="flex flex-wrap items-center gap-3">
            <Dialog>
              <DialogTrigger
                type="button"
                className={cn(buttonVariants({ variant: 'secondary' }))}
              >
                {t('dialog_about_trigger')}
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{t('dialog_about_title')}</DialogTitle>
                  <DialogDescription>{t('dialog_about_body')}</DialogDescription>
                </DialogHeader>
              </DialogContent>
            </Dialog>
            <Button type="button" onClick={increment}>
              {t('action_primary')}
            </Button>
            <span className="text-muted-foreground text-sm">
              {t('demo_count_label')}: {count}
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{t('tab_overview')}</TabsTrigger>
          <TabsTrigger value="activity">{t('tab_activity')}</TabsTrigger>
        </TabsList>
        <TabsContent value="overview">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('table_sku')}</TableHead>
                <TableHead>{t('table_channel')}</TableHead>
                <TableHead className="text-right">{t('table_margin')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell className="font-medium">WB-1001</TableCell>
                <TableCell>Wildberries</TableCell>
                <TableCell className="text-right">—</TableCell>
              </TableRow>
              <TableRow>
                <TableCell className="font-medium">OZ-2044</TableCell>
                <TableCell>Ozon</TableCell>
                <TableCell className="text-right">—</TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </TabsContent>
        <TabsContent value="activity">
          <p className="text-muted-foreground text-sm">{t('alert_setup_body')}</p>
        </TabsContent>
      </Tabs>
    </div>
  )
}
