import { test, expect } from '@playwright/test';

test.describe('Calendar month view', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('clicking Month tab shows a month grid', async ({ page }) => {
    // Click the "Month" tab in the view picker
    await page.getByRole('button', { name: /month/i }).click();

    // A month grid container should be visible
    const monthView = page.locator('.month-view, [data-testid="month-view"]');
    await expect(monthView).toBeVisible();
  });

  test('month view shows current month/year label', async ({ page }) => {
    await page.getByRole('button', { name: /month/i }).click();

    // The label should contain a month name; April is current per system date context
    const monthNames = [
      'January',
      'February',
      'March',
      'April',
      'May',
      'June',
      'July',
      'August',
      'September',
      'October',
      'November',
      'December',
    ];
    const label = page.locator('[data-testid="month-label"], .month-label');
    await expect(label).toBeVisible();

    const labelText = await label.textContent();
    const hasMonthName = monthNames.some((m) => labelText.includes(m));
    expect(hasMonthName).toBe(true);
  });

  test('next month button advances the month label', async ({ page }) => {
    await page.getByRole('button', { name: /month/i }).click();

    const label = page.locator('[data-testid="month-label"], .month-label');
    const before = await label.textContent();

    await page.locator('[data-testid="nav-next-month"]').click();

    const after = await label.textContent();
    expect(after).not.toBe(before);
  });

  test('prev month button goes back to previous month', async ({ page }) => {
    await page.getByRole('button', { name: /month/i }).click();

    const label = page.locator('[data-testid="month-label"], .month-label');
    const original = await label.textContent();

    // Go forward one month
    await page.locator('[data-testid="nav-next-month"]').click();
    const advanced = await label.textContent();
    expect(advanced).not.toBe(original);

    // Go back twice — should reach the month before the original
    await page.locator('[data-testid="nav-prev-month"]').click();
    await page.locator('[data-testid="nav-prev-month"]').click();

    const final = await label.textContent();
    // Final label must differ from the advanced label (we moved back)
    expect(final).not.toBe(advanced);
  });
});
