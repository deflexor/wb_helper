import { test, expect, Page } from '@playwright/test';

/**
 * Language Switch E2E Tests for Advanced Tools
 * Tests i18n language switching (EN/RU) on SEO Content, Returns Forecast, and Niche Analysis tools
 */

// Helper to wait for language change
async function waitForLanguageChange(page: Page, expectedLang: string): Promise<void> {
  await page.waitForFunction(
    (lang) => localStorage.getItem('wbhelper-language') === lang,
    expectedLang,
    { timeout: 5000 }
  );
  // Additional wait for i18n to propagate
  await page.waitForTimeout(500);
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

/**
 * Switches language using the TopBar language selector
 */
async function switchLanguage(page: Page, lang: 'en' | 'ru'): Promise<void> {
  const langSelect = page.getByRole('combobox', { name: '' });
  await langSelect.click();
  await page.getByRole('option', { name: new RegExp(`^${lang}$`, 'i') }).click();
  await waitForLanguageChange(page, lang);
}

test.describe('Language Switch - Advanced Tools', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await loginUser(page);
  });

  test.describe('SEO Content Tool', () => {
    test('EN: page displays English text', async ({ page }) => {
      // Arrange - Navigate to SEO Content page
      await page.goto('/seo-content');
      await page.waitForTimeout(500);

      // Assert - English headings and labels should be visible
      await expect(page.getByRole('heading', { name: /seo content/i })).toBeVisible();
      await expect(page.getByText(/create optimized content/i)).toBeVisible();
    });

    test('RU: page displays Russian text after switch', async ({ page }) => {
      // Arrange - Navigate to SEO Content page
      await page.goto('/seo-content');

      // Act - Switch to Russian
      await switchLanguage(page, 'ru');

      // Assert - Russian text should be visible
      await expect(page.getByRole('heading', { name: /SEO контент/i })).toBeVisible();
      await expect(page.getByText(/создавайте оптимизированный контент/i)).toBeVisible();
    });

    test('EN→RU→EN: language toggle persists across switches', async ({ page }) => {
      // Arrange - Navigate to SEO Content page
      await page.goto('/seo-content');

      // Act - Switch to Russian
      await switchLanguage(page, 'ru');
      await expect(page.getByRole('heading', { name: /SEO контент/i })).toBeVisible();

      // Act - Switch back to English
      await switchLanguage(page, 'en');

      // Assert - English text should be visible again
      await expect(page.getByRole('heading', { name: /seo content/i })).toBeVisible();
    });
  });

  test.describe('Returns Forecast Tool', () => {
    test('EN: page displays English text', async ({ page }) => {
      // Arrange - Navigate to Returns Forecast page
      await page.goto('/returns-forecast');
      await page.waitForTimeout(500);

      // Assert - English headings should be visible
      await expect(page.getByRole('heading', { name: /returns forecast/i })).toBeVisible();
      await expect(page.getByText(/analyze and predict return rates/i)).toBeVisible();
    });

    test('RU: page displays Russian text after switch', async ({ page }) => {
      // Arrange - Navigate to Returns Forecast page
      await page.goto('/returns-forecast');

      // Act - Switch to Russian
      await switchLanguage(page, 'ru');

      // Assert - Russian text should be visible
      await expect(page.getByRole('heading', { name: /прогноз возвратов/i })).toBeVisible();
      await expect(page.getByText(/анализ и прогнозирование ставок возвратов/i)).toBeVisible();
    });

    test('EN→RU→EN: language toggle persists across switches', async ({ page }) => {
      // Arrange - Navigate to Returns Forecast page
      await page.goto('/returns-forecast');

      // Act - Switch to Russian
      await switchLanguage(page, 'ru');
      await expect(page.getByRole('heading', { name: /прогноз возвратов/i })).toBeVisible();

      // Act - Switch back to English
      await switchLanguage(page, 'en');

      // Assert - English text should be visible again
      await expect(page.getByRole('heading', { name: /returns forecast/i })).toBeVisible();
    });

    test('RU: tabs change to Russian labels', async ({ page }) => {
      // Arrange - Navigate to Returns Forecast page and switch to Russian
      await page.goto('/returns-forecast');
      await switchLanguage(page, 'ru');

      // Assert - Tab labels should be in Russian
      await expect(page.getByRole('tab', { name: /обзор/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /подробно/i })).toBeVisible();
      await expect(page.getByRole('tab', { name: /сравнить/i })).toBeVisible();
    });

    test('EN→RU: filter labels change to Russian', async ({ page }) => {
      // Arrange - Navigate to Returns Forecast page and switch to Russian
      await page.goto('/returns-forecast');
      await switchLanguage(page, 'ru');

      // Assert - Filter labels should be in Russian
      await expect(page.getByText(/период/i)).toBeVisible();
      await expect(page.getByText(/категория/i)).toBeVisible();
      await expect(page.getByText(/уровень риска/i)).toBeVisible();
    });
  });

  test.describe('Niche Analysis Tool', () => {
    test('EN: page displays English text', async ({ page }) => {
      // Arrange - Navigate to Niche Analysis page
      await page.goto('/niche-analysis');
      await page.waitForTimeout(500);

      // Assert - English headings should be visible
      await expect(page.getByRole('heading', { name: /niche analysis/i })).toBeVisible();
      await expect(page.getByText(/analyze market niches/i)).toBeVisible();
    });

    test('RU: page displays Russian text after switch', async ({ page }) => {
      // Arrange - Navigate to Niche Analysis page
      await page.goto('/niche-analysis');

      // Act - Switch to Russian
      await switchLanguage(page, 'ru');

      // Assert - Russian text should be visible
      await expect(page.getByRole('heading', { name: /анализ ниш/i })).toBeVisible();
      await expect(page.getByText(/анализируйте рыночные ниши/i)).toBeVisible();
    });

    test('EN→RU→EN: language toggle persists across switches', async ({ page }) => {
      // Arrange - Navigate to Niche Analysis page
      await page.goto('/niche-analysis');

      // Act - Switch to Russian
      await switchLanguage(page, 'ru');
      await expect(page.getByRole('heading', { name: /анализ ниш/i })).toBeVisible();

      // Act - Switch back to English
      await switchLanguage(page, 'en');

      // Assert - English text should be visible again
      await expect(page.getByRole('heading', { name: /niche analysis/i })).toBeVisible();
    });

    test('RU: filter section labels change to Russian', async ({ page }) => {
      // Arrange - Navigate to Niche Analysis page and switch to Russian
      await page.goto('/niche-analysis');
      await switchLanguage(page, 'ru');

      // Assert - Filter labels should be in Russian
      await expect(page.getByText(/категория/i)).toBeVisible();
      await expect(page.getByText(/диапазон спроса/i)).toBeVisible();
      await expect(page.getByText(/конкуренция/i)).toBeVisible();
    });
  });

  test.describe('Cross-Tool Language Persistence', () => {
    test('language persists when navigating between tools', async ({ page }) => {
      // Arrange - Set Russian as initial language
      await page.goto('/seo-content');
      await switchLanguage(page, 'ru');
      await expect(page.getByRole('heading', { name: /SEO контент/i })).toBeVisible();

      // Act - Navigate to Returns Forecast
      await page.goto('/returns-forecast');
      await page.waitForTimeout(500);

      // Assert - Russian should still be active
      await expect(page.getByRole('heading', { name: /прогноз возвратов/i })).toBeVisible();

      // Act - Navigate to Niche Analysis
      await page.goto('/niche-analysis');
      await page.waitForTimeout(500);

      // Assert - Russian should still be active
      await expect(page.getByRole('heading', { name: /анализ ниш/i })).toBeVisible();
    });

    test('language persists after page refresh', async ({ page }) => {
      // Arrange - Switch to Russian on SEO Content page
      await page.goto('/seo-content');
      await switchLanguage(page, 'ru');
      await expect(page.getByRole('heading', { name: /SEO контент/i })).toBeVisible();

      // Act - Refresh page
      await page.reload();
      await page.waitForTimeout(1000);

      // Assert - Russian should persist
      await expect(page.getByRole('heading', { name: /SEO контент/i })).toBeVisible();
    });
  });
});
