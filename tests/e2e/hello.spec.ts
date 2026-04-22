import { test, expect } from '@playwright/test';

test.describe('Hello Page i18n', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/hello');
  });

  test('displays Hello World in English by default', async ({ page }) => {
    // Verify English text is visible
    await expect(page.getByRole('heading', { name: 'Hello World' })).toBeVisible();
  });

  test('switches to Russian and displays Привет Мир', async ({ page }) => {
    // Click Russian language button
    await page.getByRole('button', { name: 'Russian' }).click();

    // Verify Russian translation is visible
    await expect(page.getByRole('heading', { name: 'Привет Мир' })).toBeVisible();
  });

  test('can switch back to English from Russian', async ({ page }) => {
    // First switch to Russian
    await page.getByRole('button', { name: 'Russian' }).click();
    await expect(page.getByRole('heading', { name: 'Привет Мир' })).toBeVisible();

    // Then switch back to English
    await page.getByRole('button', { name: 'English' }).click();
    await expect(page.getByRole('heading', { name: 'Hello World' })).toBeVisible();
  });
});
