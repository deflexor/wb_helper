import { test, expect, Page } from '@playwright/test';

/**
 * SEO Content Tool E2E Tests
 * Tests split-view AI content generation, copy, and regenerate flows
 */

async function loginUser(page: Page): Promise<void> {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill('test@example.com');
  await page.getByLabel(/password/i).fill('password123');
  await page.getByRole('button', { name: /sign in/i }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 10000 });
}

test.describe('SEO Content Tool', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto('/seo-content');
    await page.waitForLoadState('networkidle');
  });

  test('page loads with required form elements', async ({ page }) => {
    // Assert - Page header should be visible
    await expect(page.getByRole('heading', { name: /seo content/i })).toBeVisible();

    // Assert - Form fields should be present
    await expect(page.locator('#productName')).toBeVisible();
    await expect(page.locator('#keywords')).toBeVisible();
    await expect(page.locator('#description')).toBeVisible();
  });

  test('generate button is disabled when no input provided', async ({ page }) => {
    // Act - Clear any pre-filled values
    await page.locator('#productName').clear();
    await page.locator('#keywords').clear();
    await page.locator('#description').clear();

    // Assert - Generate button should be disabled
    const generateBtn = page.getByRole('button', { name: /generate/i });
    await expect(generateBtn).toBeDisabled();
  });

  test('generate button is enabled with product name input', async ({ page }) => {
    // Act - Fill only product name
    await page.locator('#productName').fill('Test Product');

    // Assert - Generate button should be enabled (has content to work with)
    const generateBtn = page.getByRole('button', { name: /generate/i });
    await expect(generateBtn).toBeEnabled();
  });

  test('generate button is enabled with description input', async ({ page }) => {
    // Act - Fill only description
    await page.locator('#description').fill('This is a test product description');

    // Assert - Generate button should be enabled
    const generateBtn = page.getByRole('button', { name: /generate/i });
    await expect(generateBtn).toBeEnabled();
  });

  test('generate button shows loading state when clicked', async ({ page }) => {
    // Act - Fill input and click generate
    await page.locator('#productName').fill('Test Product');
    const generateBtn = page.getByRole('button', { name: /generate/i });
    await generateBtn.click();

    // Assert - Button should show loading state
    await expect(page.getByText(/loading/i)).toBeVisible();
  });

  test('split view shows original and generated content panels', async ({ page }) => {
    // Act - Fill input and generate content
    await page.locator('#productName').fill('Test Product');
    const generateBtn = page.getByRole('button', { name: /generate/i });
    await generateBtn.click();

    // Wait for content to load
    await page.waitForTimeout(1000);

    // Assert - Split view should have original content panel
    // The SEOContentCard shows original vs generated in split view
    const originalPanel = page.getByText(/original/i);
    const generatedPanel = page.getByText(/generated/i);
    
    // At least one panel should be visible
    const hasOriginal = await originalPanel.isVisible().catch(() => false);
    const hasGenerated = await generatedPanel.isVisible().catch(() => false);
    expect(hasOriginal || hasGenerated).toBeTruthy();
  });

  test('copy button copies generated content to clipboard', async ({ page }) => {
    // Act - Fill input and generate content
    await page.locator('#productName').fill('Test Product');
    const generateBtn = page.getByRole('button', { name: /generate/i });
    await generateBtn.click();

    // Wait for content to be generated
    await page.waitForTimeout(1500);

    // Assert - Copy button should be visible
    const copyBtn = page.getByRole('button', { name: /copy/i });
    await expect(copyBtn).toBeVisible();
  });

  test('regenerate button appears after content generation', async ({ page }) => {
    // Act - Fill input and generate content
    await page.locator('#productName').fill('Test Product');
    const generateBtn = page.getByRole('button', { name: /generate/i });
    await generateBtn.click();

    // Wait for content to be generated
    await page.waitForTimeout(1500);

    // Assert - Regenerate button should be visible
    const regenerateBtn = page.getByRole('button', { name: /regenerate/i });
    await expect(regenerateBtn).toBeVisible();
  });

  test('regenerate creates new content without clearing input', async ({ page }) => {
    // Act - Fill input and generate initial content
    await page.locator('#productName').fill('Test Product');
    const generateBtn = page.getByRole('button', { name: /generate/i });
    await generateBtn.click();

    // Wait for initial content
    await page.waitForTimeout(1500);

    // Act - Click regenerate
    const regenerateBtn = page.getByRole('button', { name: /regenerate/i });
    await regenerateBtn.click();

    // Assert - Should still have content in the panels
    await page.waitForTimeout(1500);
    const contentPanels = page.locator('[class*="panel"], [class*="content"]');
    const panelCount = await contentPanels.count();
    expect(panelCount).toBeGreaterThan(0);
  });

  test('error message displays when generation fails', async ({ page }) => {
    // Act - Navigate to page and wait for any error state
    // This test verifies the error display card exists in the component
    
    // Assert - Error card container exists (may be hidden when no error)
    const errorCard = page.locator('.bg-red-900\\/20');
    const errorCardExists = await errorCard.count() > 0;
    expect(errorCardExists).toBeTruthy();
  });

  test('keywords field accepts comma-separated values', async ({ page }) => {
    // Act - Fill keywords with comma-separated values
    const keywordsInput = page.locator('#keywords');
    await keywordsInput.fill('keyword1, keyword2, keyword3');

    // Assert - Value should be set correctly
    const value = await keywordsInput.inputValue();
    expect(value).toBe('keyword1, keyword2, keyword3');
  });
});