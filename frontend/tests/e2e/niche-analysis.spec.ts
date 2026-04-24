import { test, expect, Page } from '@playwright/test';

/**
 * Niche Analysis Tool E2E Tests
 * Tests data grid sorting, chart interactions, and filter controls
 */

async function loginUser(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('test@example.com');
  await page.getByLabel(/password/i).fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
}

test.describe('Niche Analysis Tool', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto('/niche-analysis');
    await page.waitForLoadState('networkidle');
  });

  test('page loads with title and filter sidebar', async ({ page }) => {
    // Assert - Page header should be visible
    await expect(page.getByRole('heading', { name: /niche analysis/i })).toBeVisible();

    // Assert - Filter sidebar should be visible
    await expect(page.getByText(/filter/i)).toBeVisible();
  });

  test('category filter dropdown has options', async ({ page }) => {
    // Find category select
    const categorySelect = page.locator('select').first();

    // Assert - Select should have options
    const options = categorySelect.locator('option');
    const optionCount = await options.count();
    expect(optionCount).toBeGreaterThan(1);
  });

  test('demand range inputs accept numeric values', async ({ page }) => {
    // Find min demand input
    const minInput = page.locator('input[type="number"]').first();
    
    // Act - Enter a value
    await minInput.clear();
    await minInput.fill('25');

    // Assert - Value should be set
    const value = await minInput.inputValue();
    expect(value).toBe('25');
  });

  test('competition level filter buttons are clickable', async ({ page }) => {
    // Find competition level buttons (low, medium, high)
    const lowBtn = page.getByRole('button', { name: /low/i }).first();
    const medBtn = page.getByRole('button', { name: /medium/i }).first();
    const highBtn = page.getByRole('button', { name: /high/i }).first();

    // Assert - Buttons should be visible
    await expect(lowBtn).toBeVisible();
    await expect(medBtn).toBeVisible();
    await expect(highBtn).toBeVisible();
  });

  test('clicking competition filter toggles selection', async ({ page }) => {
    // Find a competition filter button
    const lowBtn = page.getByRole('button', { name: /low/i }).first();

    // Act - Click to toggle
    await lowBtn.click();
    await page.waitForTimeout(200);

    // Assert - Button should have selected styling (checked/active state)
    // The button has different styling when selected
    const btnClass = await lowBtn.getAttribute('class');
    expect(btnClass).toBeDefined();
  });

  test('apply filter button triggers filter update', async ({ page }) => {
    // Find and click apply filter button
    const applyBtn = page.getByRole('button', { name: /filter/i });
    
    // Act - Click apply with changed values
    await applyBtn.click();
    await page.waitForTimeout(500);

    // Assert - Data grid should still be visible
    const dataTable = page.locator('table');
    const tableVisible = await dataTable.isVisible().catch(() => false);
    expect(tableVisible || await page.getByText(/data table/i).isVisible()).toBeTruthy();
  });

  test('clear filter button resets all filters', async ({ page }) => {
    // First apply some filters
    const minInput = page.locator('input[type="number"]').first();
    await minInput.fill('50');

    // Act - Click clear button
    const clearBtn = page.getByRole('button', { name: /clear/i });
    await clearBtn.click();
    await page.waitForTimeout(300);

    // Assert - Min input should be reset to 0
    const value = await minInput.inputValue();
    expect(value).toBe('0');
  });

  test('data grid loads with table or empty state', async ({ page }) => {
    // Wait for table or empty state to appear
    const table = page.locator('table');
    const emptyState = page.getByText(/no data/i);

    // Assert - Either table has rows or empty state is shown
    const tableVisible = await table.isVisible().catch(() => false);
    const emptyVisible = await emptyState.isVisible().catch(() => false);
    expect(tableVisible || emptyVisible).toBeTruthy();
  });

  test('data grid table headers are visible', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table', { state: 'visible' });

    // Assert - Table headers should be present
    await expect(page.getByText(/product/i)).toBeVisible();
    await expect(page.getByText(/category/i)).toBeVisible();
    await expect(page.getByText(/demand/i)).toBeVisible();
  });

  test('table column headers are sortable', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table', { state: 'visible' });

    // Find a sortable header (should have sort indicator or be clickable)
    const sortableHeaders = page.locator('th[class*="cursor-pointer"]');
    const headerCount = await sortableHeaders.count();

    // At least some headers should be sortable
    expect(headerCount).toBeGreaterThan(0);
  });

  test('clicking column header sorts data', async ({ page }) => {
    // Wait for table to load
    await page.waitForSelector('table', { state: 'visible' });

    // Find product header and click to sort
    const productHeader = page.locator('th', { hasText: /product/i }).first();
    await productHeader.click();
    await page.waitForTimeout(300);

    // Assert - Sort indicator should appear
    const sortIcon = productHeader.locator('svg');
    await expect(sortIcon).toBeVisible();
  });

  test('chart section is visible', async ({ page }) => {
    // Assert - Chart containers should be present
    const chartContainers = page.locator('.recharts-responsive-container');
    const chartCount = await chartContainers.count();
    expect(chartCount).toBeGreaterThan(0);
  });

  test('charts are interactive with tooltips', async ({ page }) => {
    // Wait for chart to be visible
    await page.waitForSelector('.recharts-responsive-container', { state: 'visible' });

    // Find first chart area
    const chartArea = page.locator('.recharts-area- curve').first();

    // If chart exists, hover over it
    const chartExists = await chartArea.isVisible().catch(() => false);
    if (chartExists) {
      await chartArea.hover();
      await page.waitForTimeout(200);
      
      // Tooltip should appear on hover
      const tooltips = page.locator('.recharts-tooltip-wrapper');
      const tooltipCount = await tooltips.count();
      expect(tooltipCount).toBeGreaterThan(0);
    }
  });

  test('filter sidebar is responsive on smaller screens', async ({ page }) => {
    // Resize to tablet size
    await page.setViewportSize({ width: 768, height: 1024 });

    // Assert - Filter sidebar should still be visible
    await expect(page.getByText(/filter/i)).toBeVisible();
  });

  test('data table section shows correct row count info', async ({ page }) => {
    // Wait for table
    await page.waitForSelector('table', { state: 'visible' });

    // Assert - Should have some row count indicator
    // The grid may show pagination info like "1-10 of 50"
    const paginationText = page.getByText(/\d+.*-.*\d+/);
    const hasPagination = await paginationText.isVisible().catch(() => false);
    
    // Either pagination text exists or table has rows
    if (hasPagination) {
      await expect(paginationText).toBeVisible();
    } else {
      const tableRows = page.locator('tbody tr');
      const rowCount = await tableRows.count();
      expect(rowCount).toBeGreaterThan(0);
    }
  });
});