import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppRoutes } from '@/AppRoutes'
import i18n from '@/i18n'
import { useSessionStore } from '@/stores/sessionStore'
import { useUiStore } from '@/stores/uiStore'
import { renderWithProviders } from '@/test/test-utils'
import { act } from 'react'
import { fireEvent, screen, waitFor } from '@testing-library/react'

describe('App routes & i18n', () => {
  beforeEach(async () => {
    localStorage.removeItem('wb-helper-session')
    useSessionStore.setState({
      token: null,
      userId: null,
      tier: null,
    })
    useUiStore.setState({ quotaState: null, usageState: null })
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

  it('shows upgrade cta and disables ai actions after quota 429', async () => {
    useSessionStore.setState({
      token: 'test-token',
      userId: 'u1',
      tier: 'free',
    })

    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            code: 'daily_quota_exceeded',
            message: 'Daily quota reached',
            used: 7,
            limit: 7,
            resets_at_utc: '2026-04-03T00:00:00Z',
            upgrade_url: 'javascript:alert(1)',
          }),
          { status: 429, statusText: 'Too Many Requests' },
        ),
      )

    renderWithProviders(
      <MemoryRouter initialEntries={['/niche']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    fireEvent.change(screen.getByLabelText('Search query or category'), {
      target: { value: 'insulated water bottles' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Run analysis' }))

    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: 'Upgrade to continue' }).length).toBeGreaterThan(0)
    })

    expect(screen.getByLabelText('Search query or category')).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Run analysis' })).toBeDisabled()
    expect(screen.getByText('Usage 7 / 7')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Upgrade to continue' })[0]).toHaveAttribute(
      'href',
      '/upgrade',
    )

    fetchMock.mockRestore()
  })

  it('shows usage badge from successful AI response headers', async () => {
    useSessionStore.setState({
      token: 'test-token',
      userId: 'u1',
      tier: 'free',
    })

    const headers = new Headers({
      'content-type': 'application/json',
      'x-quota-used': '3',
      'x-quota-limit': '10',
    })
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            content: '{"title":"T","description":"D","keywords":["k1","k2"]}',
            model_used: 'test-model',
            warnings: [],
            usage: null,
          }),
          { status: 200, headers },
        ),
      )

    renderWithProviders(
      <MemoryRouter initialEntries={['/seo']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Generate with AI' }))

    await waitFor(() => {
      expect(screen.getByText('Usage 3 / 10')).toBeInTheDocument()
    })

    fetchMock.mockRestore()
  })

  it('renders AI-generated text safely without HTML injection', async () => {
    useSessionStore.setState({
      token: 'test-token',
      userId: 'u1',
      tier: 'free',
    })

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          content: JSON.stringify({
            title: 'Safe title',
            description: '<img src=x onerror=alert(1)>',
            keywords: ['<script>alert(1)</script>', 'safe'],
          }),
          model_used: 'test-model',
          warnings: [],
          usage: null,
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      ),
    )

    renderWithProviders(
      <MemoryRouter initialEntries={['/seo']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Generate with AI' }))

    await waitFor(() => {
      expect(screen.getByTestId('seo-generated-description')).toHaveTextContent(
        '<img src=x onerror=alert(1)>',
      )
    })

    const descriptionNode = screen.getByTestId('seo-generated-description')
    const keywordsNode = screen.getByTestId('seo-generated-keywords')
    expect(descriptionNode.querySelector('img')).toBeNull()
    expect(descriptionNode.querySelector('script')).toBeNull()
    expect(keywordsNode.querySelector('script')).toBeNull()
    expect(screen.getByText('<script>alert(1)</script>, safe')).toBeInTheDocument()

    fetchMock.mockRestore()
  })

  it('clears quota lock on sign out to avoid persistence leak', async () => {
    useSessionStore.setState({
      token: 'test-token',
      userId: 'u1',
      tier: 'free',
    })
    useUiStore.setState({
      quotaState: {
        code: 'daily_quota_exceeded',
        message: 'Daily quota reached',
        used: 7,
        limit: 7,
        resets_at_utc: '2026-04-03T00:00:00Z',
        upgrade_url: 'https://example.com/upgrade',
      },
    })

    const view = renderWithProviders(
      <MemoryRouter initialEntries={['/monitoring']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByText('Usage 7 / 7')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Account' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign out' }))
    await waitFor(() => {
      expect(screen.getByText('Access your seller workspace.')).toBeInTheDocument()
    })

    view.unmount()
    useSessionStore.setState({
      token: 'test-token-2',
      userId: 'u2',
      tier: 'free',
    })

    renderWithProviders(
      <MemoryRouter initialEntries={['/monitoring']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    expect(screen.getByText('Usage —')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'Upgrade plan' })).not.toBeInTheDocument()
  })

  it('auto-clears quota lock for paid tier', async () => {
    useSessionStore.setState({
      token: 'test-token',
      userId: 'u1',
      tier: 'paid',
    })
    useUiStore.setState({
      quotaState: {
        code: 'daily_quota_exceeded',
        message: 'Daily quota reached',
        used: 4,
        limit: 4,
        resets_at_utc: '2099-01-01T00:00:00Z',
        upgrade_url: 'https://example.com/upgrade',
      },
      usageState: { used: 2, limit: 9 },
    })

    renderWithProviders(
      <MemoryRouter initialEntries={['/monitoring']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Usage —')).toBeInTheDocument()
    })
    expect(screen.queryByRole('link', { name: 'Upgrade plan' })).not.toBeInTheDocument()
  })

  it('auto-clears quota lock when reset time already passed', async () => {
    useSessionStore.setState({
      token: 'test-token',
      userId: 'u1',
      tier: 'free',
    })
    useUiStore.setState({
      quotaState: {
        code: 'daily_quota_exceeded',
        message: 'Daily quota reached',
        used: 4,
        limit: 4,
        resets_at_utc: '2000-01-01T00:00:00Z',
        upgrade_url: 'https://example.com/upgrade',
      },
      usageState: { used: 1, limit: 8 },
    })

    renderWithProviders(
      <MemoryRouter initialEntries={['/monitoring']}>
        <AppRoutes />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByText('Usage —')).toBeInTheDocument()
    })
    expect(screen.queryByRole('link', { name: 'Upgrade plan' })).not.toBeInTheDocument()
  })

  it('auto-clears quota lock on scheduled reset time', async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-04-02T00:00:00.000Z'))
    useSessionStore.setState({
      token: 'test-token',
      userId: 'u1',
      tier: 'free',
    })
    useUiStore.setState({
      quotaState: {
        code: 'daily_quota_exceeded',
        message: 'Daily quota reached',
        used: 5,
        limit: 5,
        resets_at_utc: '2026-04-02T00:00:02.000Z',
        upgrade_url: 'https://example.com/upgrade',
      },
      usageState: { used: 5, limit: 5 },
    })

    try {
      renderWithProviders(
        <MemoryRouter initialEntries={['/monitoring']}>
          <AppRoutes />
        </MemoryRouter>,
      )

      expect(screen.getByText('Usage 5 / 5')).toBeInTheDocument()
      await act(async () => {
        await vi.advanceTimersByTimeAsync(2100)
      })
      expect(screen.getByText('Usage —')).toBeInTheDocument()
      expect(screen.queryByRole('link', { name: 'Upgrade plan' })).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
