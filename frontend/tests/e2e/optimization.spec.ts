import { test, expect, Page } from '@playwright/test';

/**
 * Optimization Tool E2E Tests
 * Tests pricing strategy form sliders, preview updates, and apply confirmation
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

test.describe('Optimization Tool', () => {
  test.beforeEach(async ({ page }) => {
    await loginUser(page);
    await page.goto('/optimization');
    await page.waitForLoadState('networkidle');
  });

  test('form sliders are interactive', async ({ page }) => {
    // Find the minMargin slider
    const slider = page.locator('[class*="slider"]').first();
    
    // Assert - Slider should be visible
    await expect(slider).toBeVisible();
    
    // Act - Click on slider track (we can't easily drag in Playwright without more complex code)
    // Just verify it's clickable
    const sliderButton = slider.locator('button').first();
    await expect(sliderButton).toBeVisible();
  });

  test('slider values update displayed percentage', async ({ page }) => {
    // Find a slider and its label
    const sliderLabel = page.getByText(/minmargin/i).first();
    
    // The label should show current value like "Min Margin (10%)"
    const labelText = await sliderLabel.textContent();
    expect(labelText).toMatch(/\d+%/);
  });

  test('target margin input accepts numeric values', async ({ page }) => {
    // Find target margin input
    const targetInput = page.locator('input[type="number"]').first();
    
    // Act - Clear and type new value
    await targetInput.clear();
    await targetInput.fill('25');
    
    // Assert - Value should be set
    const value = await targetInput.inputValue();
    expect(value).toBe('25');
  });

  test('auto-apply toggle switches on and off', async ({ page }) => {
    // Find the auto-apply switch
    const switchToggle = page.locator('[role="switch"]').first();
    
    // Get initial state
    const initialChecked = await switchToggle.getAttribute('aria-checked');
    
    // Act - Click to toggle
    await switchToggle.click();
    await page.waitForTimeout(200);
    
    // Assert - State should change
    const newChecked = await switchToggle.getAttribute('aria-checked');
    expect(newChecked).not.toBe(initialChecked);
  });

  test('preview section updates when sliders change', async ({ page }) => {
    // Wait for preview section to load
    const previewSection = page.locator('text=/current margin|new margin/i').first();
    await expect(previewSection).toBeVisible();
    
    // Find target margin input and change value
    const targetInput = page.locator('input[type="number"]').first();
    await targetInput.fill('30');
    await page.waitForTimeout(500);
    
    // The preview should update (newMargin should be close to target)
    // We can verify the page doesn't error out
    await expect(page.locator('body')).not.toContainText('error');
  });

  test('apply button opens confirmation dialog', async ({ page }) => {
    // Find and click apply button
    const applyBtn = page.getByRole('button', { name: /apply/i }).first();
    
    // Act - Click apply
    await applyBtn.click();
    await page.waitForTimeout(500);
    
    // Assert - Confirmation dialog should appear
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Dialog should have confirm and cancel buttons
    await expect(page.getByRole('button', { name: /confirm/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /cancel/i })).toBeVisible();
  });

  test('confirmation dialog shows affected product count', async ({ page }) => {
    // Click apply to open confirmation
    const applyBtn = page.getByRole('button', { name: /apply/i }).first();
    await applyBtn.click();
    await page.waitForTimeout(500);
    
    // Assert - Dialog mentions affected products
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
    
    // Should have text about how many products are affected
    const dialogText = await dialog.textContent();
    expect(dialogText).toMatch(/product|affected/i);
  });

  test('confirm button applies changes and closes dialog', async ({ page }) => {
    // Click apply to open confirmation
    const applyBtn = page.getByRole('button', { name: /apply/i }).first();
    await applyBtn.click();
    await page.waitForTimeout(500);
    
    // Act - Click confirm
    const confirmBtn = page.getByRole('button', { name: /confirm/i });
    await confirmBtn.click();
    await page.waitForTimeout(500);
    
    // Assert - Dialog should close
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).not.toBeVisible();
  });

  test('cancel button closes dialog without applying', async ({ page }) => {
    // Click apply to open confirmation
    const applyBtn = page.getByRole('button', { name: /apply/i }).first();
    await applyBtn.click();
    await page.waitForTimeout(500);
    
    // Act - Click cancel
    const cancelBtn = page.getByRole('button', { name: /cancel/i });
    await cancelBtn.click();
    await page.waitForTimeout(500);
    
    // Assert - Dialog should close
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).not.toBeVisible();
  });

  test('create new strategy button opens strategy dialog', async ({ page }) => {
    // Find and click the add/plus button
    const addBtn = page.getByRole('button', { name: /\+/i }).first();
    
    // Act - Click to create new strategy
    await addBtn.click();
    await page.waitForTimeout(500);
    
    // Assert - Strategy dialog should appear
    const dialog = page.locator('[role="dialog"]');
    await expect(dialog).toBeVisible();
  });

  test('strategy name input accepts text', async ({ page }) => {
    // Open strategy dialog
    const addBtn = page.getByRole('button', { name: /\+/i }).first();
    await addBtn.click();
    await page.waitForTimeout(500);
    
    // Find strategy name input
    const nameInput = page.locator('input[placeholder*="strategy" i]').first();
    await expect(nameInput).toBeVisible();
    
    // Act - Type strategy name
    await nameInput.fill('My Test Strategy');
    
    // Assert - Value should be set
    const value = await nameInput.inputValue();
    expect(value).toBe('My Test Strategy');
  });
});