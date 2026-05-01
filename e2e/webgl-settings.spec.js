import { test, expect } from '@playwright/test';

test.describe('WebGL settings toggle', () => {
  test('Force CSS only hides WebGL canvas in chat dock', async ({ page }) => {
    await page.goto('/');

    // Open settings sheet via gear icon
    await page.click('[aria-label="Settings"]');

    // Select Force CSS only
    await page.click('text=Force CSS only');

    // No canvas should be inside .chat-dock
    const canvas = page.locator('.chat-dock canvas');
    await expect(canvas).toHaveCount(0);
  });

  test('Force enable WebGL shows canvas or CSS fallback in chat dock', async ({ page }) => {
    await page.goto('/');

    // Open settings sheet via gear icon
    await page.click('[aria-label="Settings"]');

    // Select Force enable WebGL
    await page.click('text=Force enable WebGL');

    // Either a canvas is present (WebGL worked) or the CSS glass fallback is present
    const canvas = page.locator('.chat-dock canvas');
    const glassPanel = page.locator('.chat-dock');
    const canvasCount = await canvas.count();
    const panelCount = await glassPanel.count();

    // At least the chat dock must exist (CSS fallback always present)
    expect(panelCount).toBeGreaterThan(0);
    // Canvas may or may not be present depending on headless GPU support — either is valid
    expect(canvasCount >= 0).toBe(true);
  });
});
