import { useEffect, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'

import { login } from '@/api/auth'
import { useTranslation } from '@/hooks/useTranslation'
import { useSessionStore } from '@/stores/sessionStore'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export function LoginPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const location = useLocation()
  const token = useSessionStore((s) => s.token)
  const setSession = useSessionStore((s) => s.setSession)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const from =
    (location.state as { from?: string } | null)?.from ?? '/monitoring'

  const mutation = useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setSession({
        token: data.token,
        userId: data.user_id,
        tier: data.tier === 'paid' ? 'paid' : 'free',
      })
      navigate(from, { replace: true })
    },
  })

  useEffect(() => {
    if (token) {
      navigate(from, { replace: true })
    }
  }, [token, from, navigate])

  return (
    <div className="bg-muted/30 flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-md transition-shadow hover:shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="font-heading text-2xl">{t('auth.login_title')}</CardTitle>
          <CardDescription>{t('auth.login_subtitle')}</CardDescription>
        </CardHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault()
            mutation.mutate({ email, password })
          }}
        >
          <CardContent className="space-y-4">
            {mutation.isError ? (
              <Alert variant="destructive">
                <AlertTitle>{t('auth.error_title')}</AlertTitle>
                <AlertDescription>
                  {mutation.error instanceof Error
                    ? mutation.error.message
                    : t('auth.error_generic')}
                </AlertDescription>
              </Alert>
            ) : null}
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.email')}</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.email_placeholder')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.password')}</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? t('auth.submitting') : t('auth.sign_in')}
            </Button>
            <p className="text-muted-foreground text-center text-sm">
              {t('auth.no_account')}{' '}
              <Link
                to="/register"
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                {t('auth.register_link')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
