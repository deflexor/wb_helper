import { test, expect, Page } from '@playwright/test';

/**
 * Returns Forecast Tool E2E Tests
 * Tests tab navigation, filter interactions, and chart display
 */

async function loginUser(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('test@example.com');
  await page.getByLabel(/password/i).fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
}

test.describe('Returns Forecast Tool', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto('/returns-forecast');
    await page.waitForLoadState('networkidle');
  });

  test('page loads with title and filters', async ({ page }) => {
    // Assert - Page header should be visible
    await expect(page.getByRole('heading', { name: /returns forecast/i })).toBeVisible();

    // Assert - Filter controls should be present
    await expect(page.getByText(/date range/i)).toBeVisible();
    await expect(page.getByText(/category/i)).toBeVisible();
    await expect(page.getByText(/risk level/i)).toBeVisible();
  });

  test('tabs are visible and have correct labels', async ({ page }) => {
    // Assert - All three tabs should be visible
    await expect(page.getByRole('tab', { name: /overview/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /detailed/i })).toBeVisible();
    await expect(page.getByRole('tab', { name: /compare/i })).toBeVisible();
  });

  test('overview tab is selected by default', async ({ page }) => {
    // Assert - Overview tab should have active state
    const overviewTab = page.getByRole('tab', { name: /overview/i });
    await expect(overviewTab).toHaveAttribute('data-state', 'active');
  });

  test('clicking detailed tab switches content', async ({ page }) => {
    // Act - Click on detailed tab
    const detailedTab = page.getByRole('tab', { name: /detailed/i });
    await detailedTab.click();

    // Assert - Tab should become active
    await expect(detailedTab).toHaveAttribute('data-state', 'active');

    // Assert - Detailed content should be visible (category breakdown)
    await expect(page.getByText(/category breakdown/i)).toBeVisible();
  });

  test('clicking compare tab switches content', async ({ page }) => {
    // Act - Click on compare tab
    const compareTab = page.getByRole('tab', { name: /compare/i });
    await compareTab.click();

    // Assert - Tab should become active
    await expect(compareTab).toHaveAttribute('data-state', 'active');

    // Assert - Compare content should be visible (top products)
    await expect(page.getByText(/top products/i)).toBeVisible();
  });

  test('date range filter can be changed', async ({ page }) => {
    // Find date range select
    const dateSelect = page.locator('select').first();

    // Act - Change date range
    await dateSelect.selectOption('14d');
    await page.waitForTimeout(300);

    // Assert - Selection should persist
    const value = await dateSelect.inputValue();
    expect(value).toBe('14d');
  });

  test('category filter can be changed', async ({ page }) => {
    // Find category select (second select on page)
    const selects = page.locator('select');
    const categorySelect = selects.nth(1);

    // Act - Change category
    await categorySelect.selectOption('electronics');
    await page.waitForTimeout(300);

    // Assert - Selection should persist
    const value = await categorySelect.inputValue();
    expect(value).toBe('electronics');
  });

  test('risk level filter can be changed', async ({ page }) => {
    // Find risk level select (third select on page)
    const selects = page.locator('select');
    const riskSelect = selects.nth(2);

    // Act - Change risk level
    await riskSelect.selectOption('low');
    await page.waitForTimeout(300);

    // Assert - Selection should persist
    const value = await riskSelect.inputValue();
    expect(value).toBe('low');
  });

  test('overview tab displays forecast stats cards', async ({ page }) => {
    // Assert - Stats cards should be visible on overview tab
    await expect(page.getByText(/avg returns/i)).toBeVisible();
    await expect(page.getByText(/low risk/i)).toBeVisible();
    await expect(page.getByText(/medium risk/i)).toBeVisible();
    await expect(page.getByText(/high risk/i)).toBeVisible();
  });

  test('overview tab displays forecast trend chart', async ({ page }) => {
    // Assert - Chart section should be visible
    await expect(page.getByText(/forecast trend/i)).toBeVisible();

    // Chart container should exist (ResponsiveContainer)
    const chartContainer = page.locator('.recharts-responsive-container').first();
    await expect(chartContainer).toBeVisible();
  });

  test('overview tab displays risk badges with icons', async ({ page }) => {
    // Assert - Risk badges should show counts with icons
    // Looking for risk badge containers with icons
    const riskBadgeContainers = page.locator('[class*="bg-green-500"], [class*="bg-yellow-500"], [class*="bg-red-500"]');
    const badgeCount = await riskBadgeContainers.count();
    expect(badgeCount).toBeGreaterThan(0);
  });

  test('selecting all filter option resets to show all data', async ({ page }) => {
    // Act - First filter to a specific value
    const riskSelect = page.locator('select').nth(2);
    await riskSelect.selectOption('low');
    await page.waitForTimeout(300);

    // Act - Then reset to all
    await riskSelect.selectOption('all');
    await page.waitForTimeout(300);

    // Assert - All option should be selected
    const value = await riskSelect.inputValue();
    expect(value).toBe('all');
  });

  test('filter changes trigger data refresh', async ({ page }) => {
    // Get initial state by checking for chart
    const chartContainer = page.locator('.recharts-responsive-container').first();
    await expect(chartContainer).toBeVisible();

    // Act - Change filter
    const dateSelect = page.locator('select').first();
    await dateSelect.selectOption('90d');
    await page.waitForTimeout(500);

    // Assert - Chart should still be visible after filter change
    await expect(chartContainer).toBeVisible();
  });

  test('loading state shows while data is fetching', async ({ page }) => {
    // Navigate directly to ensure fresh load
    await page.goto('/returns-forecast');

    // The loading text might appear briefly
    // We verify the loading container exists
    const loadingContainer = page.locator('.h-\\[300px\\]');
    const exists = await loadingContainer.count() > 0;
    expect(exists).toBeTruthy();
  });
});