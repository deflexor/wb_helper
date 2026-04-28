import { test, expect } from '@playwright/test';

test.describe('SEO Module - Keyword Tracking', () => {

  test.beforeEach(async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL('/dashboard');
  });

  test('should navigate to SEO tracking page', async ({ page }) => {
    await page.goto('/seo/tracking');

    // Verify page title is visible
    await expect(page.getByRole('heading', { name: /keyword tracking/i })).toBeVisible();
  });

  test('should display keywords table with mock data', async ({ page }) => {
    await page.goto('/seo/tracking');

    // Wait for table to load
    await page.waitForSelector('table');

    // Verify table headers
    await expect(page.locator('th').filter({ hasText: /keyword/i })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: /article/i })).toBeVisible();
    await expect(page.locator('th').filter({ hasText: /position/i })).toBeVisible();
  });

  test('should show add keyword button', async ({ page }) => {
    await page.goto('/seo/tracking');

    // Click add keyword button
    const addBtn = page.locator('button', { hasText: /add keyword/i });
    await expect(addBtn).toBeVisible();
  });

  test('should open add keyword form when button clicked', async ({ page }) => {
    await page.goto('/seo/tracking');

    // Click add keyword button
    await page.locator('button', { hasText: /add keyword/i }).click();

    // Wait for form to appear
    await page.waitForTimeout(500);

    // Verify form fields appear (use first() to avoid strict mode violation)
    await expect(page.getByPlaceholder('Enter keyword...')).toBeVisible();
    await expect(page.getByPlaceholder('Article ID...')).toBeVisible();
  });

  test('should have marketplace selector', async ({ page }) => {
    await page.goto('/seo/tracking');

    // Verify marketplace selector exists
    await expect(page.locator('[data-testid="marketplace-select"]')).toBeVisible();
  });

  test('should switch between WB and Ozon marketplace', async ({ page }) => {
    await page.goto('/seo/tracking');

    // Open marketplace selector
    await page.locator('[data-testid="marketplace-select"]').click();

    // Select Ozon
    await page.locator('[data-testid="marketplace-option-ozon"]').click();

    // Verify Ozon badge appears
    await expect(page.locator('[data-testid="marketplace-badge"]')).toContainText(/ozon/i);
  });
});

test.describe('SEO Module - Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL('/dashboard');
  });

  test('should display SEO dashboard with stats cards', async ({ page }) => {
    await page.goto('/seo/dashboard');

    // Verify dashboard title
    await expect(page.getByRole('heading', { name: /seo dashboard/i })).toBeVisible();

    // Verify stats cards exist (avg position, improving, declining, dropped)
    await expect(page.locator('text=/avg\. position/i')).toBeVisible();
    await expect(page.locator('text=/improving/i')).toBeVisible();
    await expect(page.locator('text=/declining/i')).toBeVisible();
    await expect(page.locator('text=/dropped keywords/i')).toBeVisible();
  });

  test('should display position trend chart', async ({ page }) => {
    await page.goto('/seo/dashboard');

    // Verify chart section exists
    await expect(page.locator('text=/position trend/i')).toBeVisible();
  });

  test('should display top keywords table', async ({ page }) => {
    await page.goto('/seo/dashboard');

    // Verify top keywords section
    await expect(page.locator('text=/top performing keywords/i')).toBeVisible();
  });

  test('should have quick action buttons', async ({ page }) => {
    await page.goto('/seo/dashboard');

    // Verify action buttons
    await expect(page.locator('button', { hasText: /check dropped/i })).toBeVisible();
    await expect(page.locator('button', { hasText: /create cluster/i })).toBeVisible();
    await expect(page.locator('button', { hasText: /add keyword/i })).toBeVisible();
  });
});

test.describe('SEO Module - Dropped Keywords', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL('/dashboard');
  });

  test('should display dropped keywords page', async ({ page }) => {
    await page.goto('/seo/dropped');

    // Verify page title
    await expect(page.getByRole('heading', { name: /dropped keywords/i })).toBeVisible();
  });
});

test.describe('SEO Module - Keyword Clusters', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL('/dashboard');
  });

  test('should display clusters page', async ({ page }) => {
    await page.goto('/seo/clusters');

    // Verify page title
    await expect(page.getByRole('heading', { name: /keyword clusters/i })).toBeVisible();
  });
});

test.describe('SEO Module - Competitor Analysis', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL('/dashboard');
  });

  test('should display competitor analysis page', async ({ page }) => {
    await page.goto('/seo/competitor');

    // Verify page title
    await expect(page.getByRole('heading', { name: /competitor analysis/i })).toBeVisible();
  });

  test('should have competitor article input', async ({ page }) => {
    await page.goto('/seo/competitor');

    // Verify input field exists (visible through premium gate)
    await expect(page.locator('input[placeholder*="article" i]')).toBeVisible();
  });
});

test.describe('SEO Module - Sidebar Navigation', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('[data-testid="email-input"]', 'test@example.com');
    await page.fill('[data-testid="password-input"]', 'password123');
    await page.click('[data-testid="login-btn"]');
    await page.waitForURL('/dashboard');
  });

  test('should show SEO Module in sidebar', async ({ page }) => {
    // Verify SEO Module link exists in sidebar
    await expect(page.locator('a[href="/seo/dashboard"]')).toBeVisible();
  });

  test('should navigate to SEO dashboard via sidebar', async ({ page }) => {
    // Click SEO Module in sidebar
    await page.locator('a[href="/seo/dashboard"]').click();

    // Wait for navigation to complete
    await expect(page).toHaveURL(/\/seo\/dashboard/, { timeout: 10000 });

    // Wait for page to render
    await page.waitForTimeout(1000);

    // Verify heading is visible
    await expect(page.getByRole('heading', { name: /seo dashboard/i })).toBeVisible();
  });
});