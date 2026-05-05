import { test, expect } from '@playwright/test';

const VIEWPORTS = [
  { name: 'mobile-iphone', width: 430, height: 932 },
  { name: 'mobile-android', width: 360, height: 800 },
  { name: 'tablet', width: 1024, height: 1366 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'widescreen', width: 3440, height: 1440 },
  { name: 'vertical-monitor', width: 1080, height: 1920 },
];

for (const vp of VIEWPORTS) {
  test.describe(`Viewport: ${vp.name} (${vp.width}×${vp.height})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
    });

    test(`landing page — day view + chat dock [${vp.name}]`, async ({ page }) => {
      await page.clock.setFixedTime(new Date('2026-01-15T09:00:00.000Z'));
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await expect(page).toHaveScreenshot(`landing-${vp.name}.png`, { animations: 'disabled' });
    });

    test(`manual form open [${vp.name}]`, async ({ page }) => {
      await page.clock.setFixedTime(new Date('2026-01-15T09:00:00.000Z'));
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: 'Switch to manual' }).click();
      await expect(page).toHaveScreenshot(`manual-form-${vp.name}.png`, { animations: 'disabled' });
    });

    test(`settings sheet open [${vp.name}]`, async ({ page }) => {
      await page.clock.setFixedTime(new Date('2026-01-15T09:00:00.000Z'));
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: 'Settings' }).click();
      await expect(page).toHaveScreenshot(`settings-${vp.name}.png`, { animations: 'disabled' });
    });

    test(`week view [${vp.name}]`, async ({ page }) => {
      await page.clock.setFixedTime(new Date('2026-01-15T09:00:00.000Z'));
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: 'Week' }).click();
      await expect(page).toHaveScreenshot(`week-view-${vp.name}.png`, { animations: 'disabled' });
    });

    test(`month view [${vp.name}]`, async ({ page }) => {
      await page.clock.setFixedTime(new Date('2026-01-15T09:00:00.000Z'));
      await page.goto('/');
      await page.waitForLoadState('networkidle');
      await page.getByRole('button', { name: 'Month' }).click();
      await expect(page).toHaveScreenshot(`month-view-${vp.name}.png`, { animations: 'disabled' });
    });
  });
}
