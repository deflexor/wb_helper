import { test, expect, Page } from '@playwright/test';

/**
 * Navigation E2E Tests
 * Tests sidebar navigation, page routing, and responsive behavior
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

test.describe('Navigation', () => {
  test('login redirects to dashboard', async ({ page }) => {
    // Arrange - Login with valid credentials
    await page.goto('/login');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByLabel(/password/i).fill('password123');

    // Act - Submit form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Assert - Should land on dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('sidebar: navigate to Competitors page', async ({ page }) => {
    // Login and navigate to dashboard
    await loginUser(page);

    // Act - Click Competitors in sidebar
    await page.getByRole('link', { name: /competitors/i }).click();

    // Assert - URL and heading
    await expect(page).toHaveURL(/\/competitors/);
    await expect(page.getByRole('heading', { name: /competitors/i })).toBeVisible();
  });

  test('sidebar: navigate to Optimization page', async ({ page }) => {
    // Login and navigate to dashboard
    await loginUser(page);

    // Act - Click Optimization in sidebar
    await page.getByRole('link', { name: /optimization/i }).click();

    // Assert - URL and heading
    await expect(page).toHaveURL(/\/optimization/);
    await expect(page.getByRole('heading', { name: /optimization/i })).toBeVisible();
  });

  test('sidebar: navigate to Settings page', async ({ page }) => {
    // Login and navigate to dashboard
    await loginUser(page);

    // Act - Click Settings in sidebar
    await page.getByRole('link', { name: /settings/i }).click();

    // Assert - URL and heading
    await expect(page).toHaveURL(/\/settings/);
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
  });

  test('sidebar: active state highlights current page', async ({ page }) => {
    // Login and navigate to dashboard
    await loginUser(page);

    // Act - Navigate to competitors
    await page.getByRole('link', { name: /competitors/i }).click();

    // Assert - Dashboard link should not have active styling
    // The active link should have the neon-volt text color and bg-white/5
    const dashboardLink = page.getByRole('link', { name: /dashboard/i });
    await expect(dashboardLink).not.toHaveClass(/text-neon-volt/);
  });

  test('mobile: sidebar is hidden by default on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await loginUser(page);

    // Assert - Sidebar should be hidden (translate-x-full)
    const sidebar = page.locator('aside');
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });

  test('mobile: hamburger button opens sidebar', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await loginUser(page);

    // Act - Click hamburger menu
    await page.locator('header button').first().click();
    await page.waitForTimeout(300);

    // Assert - Sidebar should now be visible (translate-x-0)
    const sidebar = page.locator('aside');
    await expect(sidebar).not.toHaveClass(/-translate-x-full/);
  });

  test('mobile: sidebar closes when clicking overlay', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    // Login
    await loginUser(page);

    // Open sidebar
    await page.locator('header button').first().click();
    await page.waitForTimeout(300);

    // Act - Click overlay to close
    const overlay = page.locator('.fixed.inset-0.z-40');
    await overlay.click();
    await page.waitForTimeout(300);

    // Assert - Sidebar should be hidden again
    const sidebar = page.locator('aside');
    await expect(sidebar).toHaveClass(/-translate-x-full/);
  });

  test('sidebar collapse button works on desktop', async ({ page }) => {
    // Set desktop viewport
    await page.setViewportSize({ width: 1280, height: 800 });

    // Login
    await loginUser(page);

    // Act - Click collapse button in sidebar
    const collapseBtn = page.locator('aside button').nth(1); // Second button is collapse
    await collapseBtn.click();
    await page.waitForTimeout(300);

    // Assert - Sidebar should collapse (w-16 instead of w-56)
    const sidebar = page.locator('aside');
    await expect(sidebar).toHaveClass(/w-16/);

    // Act - Click expand button
    const expandBtn = page.locator('aside button').first();
    await expandBtn.click();
    await page.waitForTimeout(300);

    // Assert - Sidebar should expand back (w-56)
    await expect(sidebar).toHaveClass(/w-56/);
  });
});