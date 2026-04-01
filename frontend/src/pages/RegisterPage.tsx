import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'

import { register } from '@/api/auth'
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

export function RegisterPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const token = useSessionStore((s) => s.token)
  const setSession = useSessionStore((s) => s.setSession)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const mutation = useMutation({
    mutationFn: register,
    onSuccess: (data) => {
      setSession({
        token: data.token,
        userId: data.user_id,
        tier: data.tier === 'paid' ? 'paid' : 'free',
      })
      navigate('/monitoring', { replace: true })
    },
  })

  useEffect(() => {
    if (token) {
      navigate('/monitoring', { replace: true })
    }
  }, [token, navigate])

  return (
    <div className="bg-muted/30 flex min-h-svh items-center justify-center p-6">
      <Card className="w-full max-w-md shadow-md transition-shadow hover:shadow-lg">
        <CardHeader className="space-y-1">
          <CardTitle className="font-heading text-2xl">
            {t('auth.register_title')}
          </CardTitle>
          <CardDescription>{t('auth.register_subtitle')}</CardDescription>
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
              <Label htmlFor="reg-email">{t('auth.email')}</Label>
              <Input
                id="reg-email"
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
              <Label htmlFor="reg-password">{t('auth.password')}</Label>
              <Input
                id="reg-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <p className="text-muted-foreground text-xs">
                {t('auth.password_hint')}
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            <Button
              type="submit"
              className="w-full"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? t('auth.submitting') : t('auth.create_account')}
            </Button>
            <p className="text-muted-foreground text-center text-sm">
              {t('auth.have_account')}{' '}
              <Link
                to="/login"
                className="text-primary font-medium underline-offset-4 hover:underline"
              >
                {t('auth.sign_in_link')}
              </Link>
            </p>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
