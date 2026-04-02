import { expect, test, type Page } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'e2e-token',
        user_id: '00000000-0000-0000-0000-000000000001',
        tier: 'free',
      }),
    })
  })
})

async function loginThroughUi(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill('e2e@test.local')
  await page.getByLabel('Password', { exact: true }).fill('password123')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/monitoring/)
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('wb-helper-session')
    return Boolean(raw?.includes('e2e-token'))
  })
}

test.describe('dashboard i18n & navigation', () => {
  test('login, switch to Russian on monitoring, switch back to English', async ({
    page,
  }) => {
    await loginThroughUi(page)

    await expect(
      page.getByRole('heading', { name: 'Competitor price monitoring' }),
    ).toBeVisible()

    await page.getByRole('button', { name: 'Account' }).click()
    await page.getByRole('menuitem', { name: 'Language' }).click()
    await page.getByTestId('language-option-ru').click()

    await expect(
      page.getByRole('heading', { name: 'Мониторинг цен конкурентов' }),
    ).toBeVisible()

    // Switch back to English via i18next storage (nested submenu trigger is animation-unstable in automation).
    await page.evaluate(() => {
      localStorage.setItem('i18nextLng', 'en')
    })
    await page.reload()
    await page.waitForFunction(() =>
      Boolean(localStorage.getItem('wb-helper-session')?.includes('e2e-token')),
    )
    if (page.url().includes('/login')) {
      await page.goto('/monitoring')
    }
    await expect(
      page.getByRole('heading', { name: 'Competitor price monitoring' }),
    ).toBeVisible()
  })

  test('responsive: mobile menu reaches monitoring and pricing', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await loginThroughUi(page)

    await page.getByRole('button', { name: 'Open navigation menu' }).click()
    await page.getByRole('link', { name: 'Pricing' }).click()
    await expect(page).toHaveURL(/\/pricing/)
    await expect(
      page.getByRole('heading', { name: 'Dynamic price optimization' }),
    ).toBeVisible()
  })

  test('price optimization opens confirm dialog', async ({ page }) => {
    await loginThroughUi(page)
    await page.getByRole('link', { name: 'Pricing' }).click()
    await expect(page).toHaveURL(/\/pricing/)

    await page.getByRole('button', { name: 'Review & apply' }).click()
    await expect(
      page.getByRole('heading', { name: 'Apply new price?' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
    await expect(
      page.getByRole('heading', { name: 'Apply new price?' }),
    ).toBeHidden()
  })
})

async function loginPaidThroughUi(page: Page) {
  await page.route('**/api/auth/login', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        token: 'e2e-paid-token',
        user_id: '00000000-0000-0000-0000-000000000002',
        tier: 'paid',
      }),
    })
  })
  await page.goto('/login')
  await page.getByLabel('Email', { exact: true }).fill('paid-e2e@test.local')
  await page.getByLabel('Password', { exact: true }).fill('password123')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page).toHaveURL(/\/monitoring/)
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('wb-helper-session')
    return Boolean(raw?.includes('e2e-paid-token'))
  })
}

test.describe('advanced tools (phase 5)', () => {
  test('SEO: generate populates description in comparison panel', async ({
    page,
  }) => {
    await page.route('**/api/ai/chat', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          content: JSON.stringify({
            title: 'E2E SEO Title',
            description: 'E2E generated description for card.',
            keywords: ['e2e', 'seo'],
          }),
          model_used: 'e2e-model',
          warnings: [],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30,
          },
        }),
      })
    })
    await loginPaidThroughUi(page)
    await page.goto('/seo')
    await expect(
      page.getByRole('heading', { name: 'SEO content generation' }),
    ).toBeVisible()
    await page.getByRole('button', { name: 'Generate with AI' }).click()
    await expect(page.getByTestId('seo-generated-description')).toHaveText(
      /E2E generated description/,
    )
  })

  test('Returns forecast: chart container renders', async ({ page }) => {
    await loginThroughUi(page)
    await page.goto('/returns')
    await expect(
      page.getByRole('heading', { name: 'Returns forecast' }),
    ).toBeVisible()
    await expect(page.getByTestId('returns-risk-chart')).toBeVisible()
  })

  test('Niche analysis: loading then error handling', async ({ page }) => {
    let continueRequest: (() => void) | undefined
    const gate = new Promise<void>((resolve) => {
      continueRequest = resolve
    })
    await page.route('**/api/ai/niche', async (route) => {
      await gate
      await route.fulfill({
        status: 502,
        contentType: 'text/plain',
        body: 'upstream failed',
      })
    })
    await loginPaidThroughUi(page)
    await page.goto('/niche')
    await page.getByLabel('Search query or category', { exact: false }).fill('test query')
    await page.getByRole('button', { name: 'Run analysis' }).click()
    await expect(page.getByTestId('niche-loading')).toBeVisible()
    continueRequest?.()
    await expect(page.getByTestId('niche-error')).toBeVisible()
  })
})
