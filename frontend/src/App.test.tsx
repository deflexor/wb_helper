import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it } from 'vitest'

import { AppRoutes } from '@/AppRoutes'
import i18n from '@/i18n'
import { useSessionStore } from '@/stores/sessionStore'
import { renderWithProviders } from '@/test/test-utils'
import { screen, waitFor } from '@testing-library/react'

describe('App routes & i18n', () => {
  beforeEach(async () => {
    localStorage.removeItem('wb-helper-session')
    useSessionStore.setState({
      token: null,
      userId: null,
      tier: null,
    })
    await i18n.changeLanguage('en')
  })

  it('shows English sign-in page on /login', () => {
    renderWithProviders(
      <MemoryRouter initialEntries={['/login']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(screen.getByText('Access your seller workspace.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Sign in' }),
    ).toBeInTheDocument()
  })

  it('updates monitoring title when language switches', async () => {
    useSessionStore.setState({
      token: 'test-token',
      userId: 'u1',
      tier: 'free',
    })
    await i18n.changeLanguage('ru')
    renderWithProviders(
      <MemoryRouter initialEntries={['/monitoring']}>
        <AppRoutes />
      </MemoryRouter>,
    )
    expect(
      screen.getByRole('heading', {
        level: 1,
        name: 'Мониторинг цен конкурентов',
      }),
    ).toBeInTheDocument()

    await i18n.changeLanguage('en')
    await waitFor(() => {
      expect(
        screen.getByRole('heading', {
          level: 1,
          name: 'Competitor price monitoring',
        }),
      ).toBeInTheDocument()
    })
  })
})
