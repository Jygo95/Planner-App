import { test, expect } from '@playwright/test';

const viewports = [
  { name: 'mobile-iphone', width: 430, height: 932 },
  { name: 'mobile-android', width: 360, height: 800 },
  { name: 'tablet', width: 1024, height: 1366 },
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'widescreen', width: 3440, height: 1440 },
  { name: 'vertical-monitor', width: 1080, height: 1920 },
];

for (const { name, width, height } of viewports) {
  test(`gear icon visible on ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await expect(page.locator('[aria-label="Settings"]')).toBeVisible();
  });

  test(`settings sheet opens on ${name}`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/');
    await page.click('[aria-label="Settings"]');
    await expect(page.getByText('Auto')).toBeVisible();
    await expect(page.getByText('Force enable WebGL')).toBeVisible();
    await expect(page.getByText('Force CSS only')).toBeVisible();
  });
}
