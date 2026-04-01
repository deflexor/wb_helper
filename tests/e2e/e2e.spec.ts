import { expect, test } from '@playwright/test'

test.describe('frontend smoke', () => {
  test('loads the seller workspace shell', async ({ page }) => {
    await page.goto('/')
    await expect(
      page.getByRole('heading', { level: 1, name: 'Seller workspace' }),
    ).toBeVisible()
  })
})
