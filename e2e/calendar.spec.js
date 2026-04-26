import { test, expect } from '@playwright/test';

test.describe('Calendar day view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('day view room columns are visible on app load', async ({ page }) => {
    // The calendar should show day view with at least one room column visible
    await expect(page.locator('[data-testid="day-view"]')).toBeVisible();
    await expect(page.locator('[data-testid="room-column-california"]')).toBeVisible();
    await expect(page.locator('[data-testid="room-column-nevada"]')).toBeVisible();
    await expect(page.locator('[data-testid="room-column-oregon"]')).toBeVisible();
  });

  test('prev and next day navigation buttons are present and clickable', async ({ page }) => {
    const prevBtn = page.locator('[data-testid="nav-prev-day"]');
    const nextBtn = page.locator('[data-testid="nav-next-day"]');

    await expect(prevBtn).toBeVisible();
    await expect(nextBtn).toBeVisible();

    // Buttons are clickable (no error thrown)
    await prevBtn.click();
    await nextBtn.click();
  });

  test('room filter renders 3 toggles', async ({ page }) => {
    const checkboxes = page.locator('[data-testid="room-filter"] input[type="checkbox"]');
    await expect(checkboxes).toHaveCount(3);
  });

  test('time indicator element is present in day view', async ({ page }) => {
    await expect(page.locator('[data-testid="time-indicator"]')).toBeVisible();
  });
});
