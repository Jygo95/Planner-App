import { test, expect } from '@playwright/test';

test('health endpoint returns ok', async ({ page }) => {
  const response = await page.goto('/api/health');
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.ok).toBe(true);
});
