import { test, expect } from '@playwright/test';

// Visual baseline spec — captures screenshots of key views.
// These tests do NOT compare pixels; they simply verify the app loads
// and the expected elements are present, then take a screenshot.
// Actual regression comparison is deferred to task 17.

test.describe('Visual baseline (liquid-glass)', () => {
  test('day view — calendar-area is visible and screenshot captured', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.calendar-area')).toBeVisible();
    await page.screenshot({
      path: 'test-results/visual-baseline-desktop-day.png',
      fullPage: false,
    });
  });

  test('month view — visible and screenshot captured', async ({ page }) => {
    await page.goto('/');
    // Switch to Month view
    await page.getByRole('button', { name: /month/i }).click();
    await expect(page.locator('[data-testid="month-view"]')).toBeVisible();
    await page.screenshot({
      path: 'test-results/visual-baseline-desktop-month.png',
      fullPage: false,
    });
  });

  test('settings sheet — gear icon opens settings and screenshot captured', async ({ page }) => {
    await page.goto('/');
    await page.locator('button[aria-label="Settings"]').click();
    // Wait for the settings sheet to appear
    await expect(page.locator('.settings-sheet')).toBeVisible();
    await page.screenshot({
      path: 'test-results/visual-baseline-desktop-settings.png',
      fullPage: false,
    });
  });
});
