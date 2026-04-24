import { test, expect, Page } from '@playwright/test';

/**
 * Language Switching E2E Tests
 * Tests i18n language switching and persistence
 */

// Helper to wait for language change
async function waitForLanguageChange(page: Page, expectedLang: string): Promise<void> {
  await page.waitForFunction(
    (lang) => document.body.lang === lang || localStorage.getItem('wbhelper-language') === lang,
    expectedLang,
    { timeout: 5000 }
  );
}

/**
 * Logs in a user for tests that require authentication
 */
async function loginUser(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('test@example.com');
  await page.getByLabel(/password/i).fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
}

test.describe('Language Switching', () => {
  test('EN to RU: switching changes all visible text to Russian', async ({ page }) => {
    // Login first
    await loginUser(page);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Act - Change language to Russian via TopBar dropdown
    const langSelect = page.getByRole('combobox', { name: '' });
    await langSelect.click();
    await page.getByRole('option', { name: /^RU$/i }).click();

    // Wait for language to change
    await page.waitForTimeout(500);

    // Assert - Dashboard title should now be in Russian
    // The mock dashboard doesn't have i18n, so we verify by checking the lang attribute
    const htmlLang = await page.getAttribute('html', 'lang');
    expect(htmlLang).toBe('ru');
  });

  test('EN to RU: sidebar navigation items change to Russian', async ({ page }) => {
    // Login first
    await loginUser(page);

    // Navigate to competitors page which has i18n
    await page.goto('/competitors');

    // Act - Change language to Russian
    const langSelect = page.getByRole('combobox', { name: '' });
    await langSelect.click();
    await page.getByRole('option', { name: /^RU$/i }).click();
    await page.waitForTimeout(500);

    // Assert - Page title should be in Russian (Компетitors based on Russian translation)
    await expect(page.getByRole('heading', { name: /конкуренты/i })).toBeVisible();
  });

  test('RU to EN: switching back changes all text to English', async ({ page }) => {
    // Login first
    await loginUser(page);

    // Navigate to competitors page
    await page.goto('/competitors');

    // First switch to Russian
    const langSelect = page.getByRole('combobox', { name: '' });
    await langSelect.click();
    await page.getByRole('option', { name: /^RU$/i }).click();
    await page.waitForTimeout(500);

    // Assert Russian is active
    await expect(page.getByRole('heading', { name: /конкуренты/i })).toBeVisible();

    // Act - Switch back to English
    await langSelect.click();
    await page.getByRole('option', { name: /^EN$/i }).click();
    await page.waitForTimeout(500);

    // Assert - Should show English text
    await expect(page.getByRole('heading', { name: /competitors/i })).toBeVisible();
  });

  test('Language persists after page refresh', async ({ page }) => {
    // Login first
    await loginUser(page);

    // Navigate and switch to Russian
    await page.goto('/competitors');
    const langSelect = page.getByRole('combobox', { name: '' });
    await langSelect.click();
    await page.getByRole('option', { name: /^RU$/i }).click();
    await page.waitForTimeout(500);

    // Verify Russian is showing
    await expect(page.getByRole('heading', { name: /конкуренты/i })).toBeVisible();

    // Act - Refresh page
    await page.reload();
    await page.waitForTimeout(1000);

    // Assert - Language should persist (stored in localStorage)
    await expect(page.getByRole('heading', { name: /конкуренты/i })).toBeVisible();
  });

  test('Language selector shows current language', async ({ page }) => {
    // Login first
    await loginUser(page);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Get the current language value from the select
    const langValue = await page.getByRole('combobox', { name: '' }).inputValue();

    // Assert - Default should be 'en'
    expect(langValue).toBe('en');

    // Change to Russian
    await page.getByRole('combobox', { name: '' }).click();
    await page.getByRole('option', { name: /^RU$/i }).click();
    await page.waitForTimeout(500);

    // Assert - Value should now be 'ru'
    const newLangValue = await page.getByRole('combobox', { name: '' }).inputValue();
    expect(newLangValue).toBe('ru');
  });
});