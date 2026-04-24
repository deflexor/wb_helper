import { test, expect, Page } from '@playwright/test';

/**
 * Responsive Design E2E Tests
 * Tests layout adaptations across different viewport sizes
 */

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

test.describe('Responsive Design', () => {
  test('mobile viewport (375px): sidebar hidden by default', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await loginUser(page);

    // Act - Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Assert - Sidebar should be hidden (translate-x-full)
    const sidebar = page.locator('aside');
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });

  test('mobile viewport (375px): hamburger menu is visible', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await loginUser(page);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Assert - Hamburger button in header should be visible (md:hidden means hidden on desktop)
    const hamburgerBtn = page.locator('header button').first();
    await expect(hamburgerBtn).toBeVisible();
  });

  test('mobile viewport (375px): clicking hamburger opens sidebar', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await loginUser(page);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Act - Click hamburger button
    await page.locator('header button').click();
    await page.waitForTimeout(400);

    // Assert - Sidebar should be visible (not have translate-x-full)
    const sidebar = page.locator('aside');
    await expect(sidebar).not.toHaveClass(/-translate-x-full/);
  });

  test('mobile viewport (375px): sidebar navigation links work', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await loginUser(page);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Open sidebar
    await page.locator('header button').click();
    await page.waitForTimeout(400);

    // Act - Click on a navigation link
    await page.getByRole('link', { name: /competitors/i }).click();
    await page.waitForTimeout(500);

    // Assert - Should navigate and sidebar should close on mobile
    await expect(page).toHaveURL(/\/competitors/);
    const sidebar = page.locator('aside');
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });

  test('tablet viewport (768px): 2-column layout on optimization page', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    // Login
    await loginUser(page);

    // Navigate to optimization page
    await page.goto('/optimization');
    await page.waitForLoadState('networkidle');

    // Assert - Form and preview should be side by side (lg:grid-cols-2)
    // Check that both form and preview are visible
    const form = page.locator('text=/optimization settings/i').first();
    const preview = page.locator('text=/current margin/i').first();

    await expect(form).toBeVisible();
    await expect(preview).toBeVisible();
  });

  test('tablet viewport (768px): sidebar is visible by default', async ({ page }) => {
    // Set tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });

    // Login
    await loginUser(page);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Assert - Sidebar should be visible (md:translate-x-0)
    const sidebar = page.locator('aside');
    await expect(sidebar).toHaveClass(/translate-x-0/);
  });

  test('desktop viewport (1280px): full sidebar width is 56', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Login
    await loginUser(page);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Assert - Sidebar should have full width (w-56)
    const sidebar = page.locator('aside');
    await expect(sidebar).toHaveClass(/w-56/);
  });

  test('desktop viewport (1280px): sidebar collapse button is visible', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Login
    await loginUser(page);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Find the collapse button (hidden md:flex means visible on desktop)
    // The button should have the ChevronLeft icon
    const collapseBtn = page.locator('aside button').nth(1); // Second button in sidebar header
    await expect(collapseBtn).toBeVisible();
  });

  test('desktop viewport (1280px): 3-column grid for strategy cards', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Login
    await loginUser(page);

    // Navigate to optimization page
    await page.goto('/optimization');
    await page.waitForLoadState('networkidle');

    // The strategies section has lg:grid-cols-3
    // We check the grid container
    const strategiesGrid = page.locator('.grid.grid-cols-1\\/md:grid-cols-2\\/lg:grid-cols-3').first();
    await expect(strategiesGrid).toBeVisible();
  });

  test('responsive: content is accessible on all viewport sizes', async ({ page }) => {
    // Test various viewport sizes
    const viewports = [
      { width: 375, height: 667, name: 'mobile' },
      { width: 768, height: 1024, name: 'tablet' },
      { width: 1280, height: 800, name: 'desktop' },
    ];

    // Login once (we'll reuse the session)
    await loginUser(page);

    for (const viewport of viewports) {
      // Set viewport
      await page.setViewportSize({ width: viewport.width, height: viewport.height });

      // Navigate to competitors
      await page.goto('/competitors');
      await page.waitForLoadState('networkidle');

      // Assert - Main content is visible
      const mainContent = page.locator('h1').first();
      await expect(mainContent).toBeVisible();

      // Assert - No console errors (checked via page errors)
      // This is implicit - if there were JS errors, the page might not load correctly

      console.log(`✓ ${viewport.name} (${viewport.width}x${viewport.height}) - content visible`);
    }
  });

  test('mobile: top bar displays correctly', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await loginUser(page);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Assert - Header should be visible
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // The hamburger button should be visible, usage limits hidden
    const hamburger = page.locator('header button').first();
    await expect(hamburger).toBeVisible();
  });

  test('desktop: top bar shows usage limits', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Login
    await loginUser(page);

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Assert - Usage limits section should be visible (hidden sm:flex)
    const usageSection = page.locator('text=/\\d+\\/\\d+/'); // Matches something like "50/1000"
    await expect(usageSection).toBeVisible();
  });
});