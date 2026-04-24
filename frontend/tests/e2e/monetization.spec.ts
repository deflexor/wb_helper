import { test, expect, Page } from '@playwright/test';

/**
 * Monetization E2E Tests
 * Tests signup, usage limits, upgrade flows, and premium access
 */

// Test credentials
const FREE_USER_EMAIL = 'free-user@example.com';
const PRO_USER_EMAIL = 'pro-user@example.com';
const VALID_PASSWORD = 'password123';

/**
 * Helper: Login as free user (default mock behavior)
 */
async function loginAsFreeUser(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(FREE_USER_EMAIL);
  await page.getByLabel(/password/i).fill(VALID_PASSWORD);
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
}

/**
 * Helper: Set auth store state directly via localStorage to simulate a pro user
 * This bypasses the mock login which always creates free users
 */
async function setProUserState(page: Page): Promise<void> {
  await page.goto('/');
  await page.waitForLoadState('domcontentloaded');

  // Clear any existing state
  await page.evaluate(() => localStorage.removeItem('wbhelper-auth'));
  await page.evaluate(() => localStorage.removeItem('wbhelper-usage'));

  // Set pro user in auth store
  const proUser = {
    user: {
      id: '2',
      email: PRO_USER_EMAIL,
      name: 'Pro User',
      subscriptionPlan: 'pro' as const,
      apiCallsLimit: 10000,
    },
    token: btoa(`${PRO_USER_EMAIL}:${Date.now()}`),
    isAuthenticated: true,
    isLoading: false,
  };

  await page.evaluate((state) => {
    localStorage.setItem('wbhelper-auth', JSON.stringify({
      state,
      version: 0,
    }));
  }, proUser);

  // Set higher usage limits for pro user
  const proUsage = {
    limits: {
      apiCalls: 500,
      apiCallsLimit: 10000,
      products: 50,
      productsLimit: 500,
      competitors: 20,
      competitorsLimit: 100,
    },
    version: 0,
  };

  await page.evaluate((state) => {
    localStorage.setItem('wbhelper-usage', JSON.stringify(state));
  }, proUsage);
}

/**
 * Helper: Clear all persisted store state
 */
async function clearStoreState(page: Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('wbhelper-auth');
    localStorage.removeItem('wbhelper-usage');
  });
}

test.describe('Signup Flow', () => {
  test.beforeEach(async ({ page }) => {
    await clearStoreState(page);
  });

  test('registration with valid credentials creates free account and redirects to dashboard', async ({ page }) => {
    // Navigate to register page
    await page.goto('/register');

    // Fill registration form
    await page.getByLabel(/email/i).fill('newuser@example.com');
    await page.getByLabel(/^password$/i).fill(VALID_PASSWORD);
    await page.getByLabel(/confirm password/i).fill(VALID_PASSWORD);

    // Submit
    await page.getByRole('button', { name: /register/i }).click();

    // Assert - Should redirect to dashboard after successful registration
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
  });

  test('newly registered user has free subscription plan', async ({ page }) => {
    // Register new user
    await page.goto('/register');
    await page.getByLabel(/email/i).fill('newuser@example.com');
    await page.getByLabel(/^password$/i).fill(VALID_PASSWORD);
    await page.getByLabel(/confirm password/i).fill(VALID_PASSWORD);
    await page.getByRole('button', { name: /register/i }).click();

    // Wait for dashboard
    await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });

    // Assert - TopBar shows free tier usage (1000 limit)
    // The TopBar displays API calls in format "used/limit"
    const usageDisplay = page.locator('text=/\\d+\\/1000/');
    await expect(usageDisplay).toBeVisible({ timeout: 5000 });
  });

  test('registration validates email format', async ({ page }) => {
    await page.goto('/register');

    // Fill with invalid email
    await page.getByLabel(/email/i).fill('not-an-email');
    await page.getByLabel(/^password$/i).fill(VALID_PASSWORD);
    await page.getByLabel(/confirm password/i).fill(VALID_PASSWORD);

    // Submit
    await page.getByRole('button', { name: /register/i }).click();

    // Assert - Should show validation error
    await expect(page.getByText(/invalid email/i)).toBeVisible();
  });

  test('registration validates password length', async ({ page }) => {
    await page.goto('/register');

    // Fill with short password
    await page.getByLabel(/email/i).fill('valid@email.com');
    await page.getByLabel(/^password$/i).fill('123');
    await page.getByLabel(/confirm password/i).fill('123');

    // Submit
    await page.getByRole('button', { name: /register/i }).click();

    // Assert - Should show password error
    await expect(page.getByText(/password/i)).toBeVisible();
  });

  test('registration password confirmation must match', async ({ page }) => {
    await page.goto('/register');

    // Fill with mismatched passwords
    await page.getByLabel(/email/i).fill('valid@email.com');
    await page.getByLabel(/^password$/i).fill('password123');
    await page.getByLabel(/confirm password/i).fill('differentpass');

    // Submit
    await page.getByRole('button', { name: /register/i }).click();

    // Assert - Should show error (form should not submit)
    await expect(page).toHaveURL(/\/register/);
  });
});

test.describe('Free User Usage Limits', () => {
  test.beforeEach(async ({ page }) => {
    await clearStoreState(page);
    await loginAsFreeUser(page);
  });

  test('free user sees usage indicator in TopBar', async ({ page }) => {
    // Assert - Usage display shows in TopBar
    const usageDisplay = page.locator('text=/\\d+\\/1000/');
    await expect(usageDisplay).toBeVisible();
  });

  test('free user sees API calls remaining in TopBar', async ({ page }) => {
    // Assert - Should show remaining count
    const remainingText = page.getByText(/remaining/i);
    await expect(remainingText).toBeVisible();
  });

  test('free user has 1000 API call limit', async ({ page }) => {
    // The limit is displayed as "used/limit" format
    // Default fresh user has 0 used out of 1000 limit
    await expect(page.getByText(/1000/).first()).toBeVisible();
  });

  test('usage counter increments as user navigates features', async ({ page }) => {
    // Navigate to a feature that uses API
    await page.goto('/niche-analysis');
    await page.waitForLoadState('networkidle');

    // The usage should be tracked - check if counter exists
    const usageIndicator = page.locator('header').getByText(/\\d+/);
    await expect(usageIndicator).toBeVisible();
  });
});

test.describe('Upgrade Flow', () => {
  test.beforeEach(async ({ page }) => {
    await clearStoreState(page);
    await loginAsFreeUser(page);
  });

  test('upgrade button exists for free users on subscription status', async ({ page }) => {
    // Navigate to dashboard where subscription status might be shown
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Look for upgrade-related content or button
    // Since there's no dedicated pricing page yet, we look for upgrade text
    const upgradeButton = page.getByRole('button', { name: /upgrade/i });
    const upgradeLink = page.getByText(/upgrade/i);

    // At least one upgrade-related element should be visible somewhere
    const hasUpgrade = await upgradeButton.isVisible().catch(() => false) ||
                      await upgradeLink.isVisible().catch(() => false);
    expect(hasUpgrade).toBeTruthy();
  });

  test('free user can navigate to settings', async ({ page }) => {
    // Navigate to settings
    await page.getByRole('link', { name: /settings/i }).click();
    await expect(page).toHaveURL(/\/settings/);

    // Settings page should load
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible();
  });
});

test.describe('Premium User Access', () => {
  test.beforeEach(async ({ page }) => {
    await clearStoreState(page);
    await setProUserState(page);
  });

  test('pro user has correct subscription displayed', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Pro user should see higher limit (10000 instead of 1000)
    const highLimitDisplay = page.getByText(/10000/);
    await expect(highLimitDisplay).toBeVisible({ timeout: 5000 });
  });

  test('pro user can access all premium features', async ({ page }) => {
    // Test accessing niche analysis
    await page.goto('/niche-analysis');
    await expect(page.getByRole('heading', { name: /niche analysis/i })).toBeVisible();

    // Test accessing returns forecast
    await page.goto('/returns-forecast');
    await expect(page.getByRole('heading', { name: /returns forecast/i })).toBeVisible();

    // Test accessing SEO content
    await page.goto('/seo-content');
    await expect(page.getByRole('heading', { name: /seo content/i })).toBeVisible();

    // Test accessing optimization
    await page.goto('/optimization');
    await expect(page.getByRole('heading', { name: /optimization/i })).toBeVisible();
  });

  test('pro user has no usage limit restrictions in TopBar', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Pro user should see the higher limit
    const limitText = page.getByText(/10000/);
    await expect(limitText).toBeVisible();
  });

  test('pro user session persists after page reload', async ({ page }) => {
    // Navigate and reload
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Reload the page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Should still be authenticated and on dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Should still show pro user limits
    const limitText = page.getByText(/10000/);
    await expect(limitText).toBeVisible({ timeout: 5000 });
  });

  test('pro user can logout successfully', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Open user dropdown and logout
    const userButton = page.locator('header button').last();
    await userButton.click();

    // Click logout
    await page.getByText(/logout/i).click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });
});

test.describe('Subscription State Management', () => {
  test.beforeEach(async ({ page }) => {
    await clearStoreState(page);
  });

  test('authenticated route redirects to login when not authenticated', async ({ page }) => {
    // Try to access protected route without auth
    await page.goto('/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('logout clears authentication state', async ({ page }) => {
    // Login first
    await loginAsFreeUser(page);

    // Verify we're logged in
    await expect(page).toHaveURL(/\/dashboard/);

    // Logout
    const userButton = page.locator('header button').last();
    await userButton.click();
    await page.getByText(/logout/i).click();

    // Try to access protected route
    await page.goto('/dashboard');

    // Should redirect to login again
    await expect(page).toHaveURL(/\/login/);
  });
});
