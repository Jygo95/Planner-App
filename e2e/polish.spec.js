/**
 * E2E tests for increment 18 — Polish Pass (FR-V-7, NFR-5)
 *
 * Tests are RED until:
 *   - The full toast system is implemented (ToastContainer, Toast, ToastContext)
 *   - The ManualForm wires showToast on booking success
 *
 * Covers:
 *   1. Toast appears after booking is confirmed (manual form submit)
 *   2. Toast auto-dismisses after 5 seconds
 *   3. Toast close button removes toast immediately
 *   4. Keyboard navigation: Tab reaches "Switch to manual" link; Tab through form fields in order
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Return a unique future-date day offset derived from (project × 5) + testSlot.
 * Each browser project gets a band of 5 days (chromium: 30-34, firefox: 35-39,
 * webkit: 40-44) so bookings never collide across projects even though the
 * Playwright worker reloads module state per project.
 */
function getDayOffset(testInfo) {
  const projects = ['chromium', 'firefox', 'webkit'];
  const projectIdx = Math.max(0, projects.indexOf(testInfo.project.name));

  const slots = {
    appears: 0,
    'auto-dismisses': 1,
    'close button': 2,
  };
  const title = testInfo.title.toLowerCase();
  const testSlot = Object.entries(slots).find(([k]) => title.includes(k))?.[1] ?? 0;

  return 30 + projectIdx * 5 + testSlot;
}

/** Fill and submit the manual booking form with a project+test-unique future date */
async function submitManualForm(page, testInfo) {
  // Click "Switch to manual" to reveal the form
  await page.getByRole('button', { name: /switch to manual/i }).click();

  const dayOffset = getDayOffset(testInfo);
  const future = new Date();
  future.setDate(future.getDate() + dayOffset);
  const dateStr = future.toISOString().slice(0, 10); // YYYY-MM-DD

  await page.getByLabel(/room/i).selectOption({ index: 1 });
  await page.getByLabel(/date/i).fill(dateStr);
  await page.getByLabel(/start time/i).fill('10:00');
  await page.getByLabel(/end time/i).fill('11:00');
  await page.getByLabel(/booker name/i).fill('Playwright Test User');

  // Submit — button text is "Preview booking"
  await page.getByRole('button', { name: /preview booking/i }).click();

  // The confirmation card may appear — confirm it
  const confirmBtn = page.getByRole('button', { name: /confirm/i });
  if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
    await confirmBtn.click();
  }
}

// ---------------------------------------------------------------------------
// 1. Toast appears when a booking is confirmed
// ---------------------------------------------------------------------------
test('toast appears with "Booking confirmed" after manual form submit', async ({
  page,
}, testInfo) => {
  await page.goto('/');

  await submitManualForm(page, testInfo);

  // The toast should appear with "Booking confirmed."
  await expect(page.getByText(/booking confirmed/i)).toBeVisible({ timeout: 8000 });
});

// ---------------------------------------------------------------------------
// 2. Toast auto-dismisses after 5 seconds
// ---------------------------------------------------------------------------
test('toast auto-dismisses after 5 seconds', async ({ page }, testInfo) => {
  await page.goto('/');

  await submitManualForm(page, testInfo);

  // Toast should appear
  await expect(page.getByText(/booking confirmed/i)).toBeVisible({ timeout: 8000 });

  // Wait just over 5 seconds
  await page.waitForTimeout(5500);

  // Toast should be gone
  await expect(page.getByText(/booking confirmed/i)).not.toBeVisible();
});

// ---------------------------------------------------------------------------
// 3. Toast close button removes the toast immediately
// ---------------------------------------------------------------------------
test('toast close button removes toast immediately', async ({ page }, testInfo) => {
  await page.goto('/');

  await submitManualForm(page, testInfo);

  // Toast should appear
  await expect(page.getByText(/booking confirmed/i)).toBeVisible({ timeout: 8000 });

  // Click the close button on the toast
  const closeBtn = page.locator('.toast__close').first();
  await expect(closeBtn).toBeVisible({ timeout: 3000 });
  await closeBtn.click();

  // Toast should be gone immediately (within 500ms)
  await expect(page.getByText(/booking confirmed/i)).not.toBeVisible({ timeout: 500 });
});

// ---------------------------------------------------------------------------
// 4. Keyboard navigation — Tab reaches "Switch to manual" without mouse
// ---------------------------------------------------------------------------
test('keyboard nav: Tab from page load reaches "Switch to manual" link/button', async ({
  page,
}) => {
  await page.goto('/');

  // Start keyboard nav from the top — press Tab until we reach the button
  // or exhaust 20 tabs (sufficient for any reasonable page)
  let found = false;
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.textContent?.trim() ?? '');
    const role = await page.evaluate(() => document.activeElement?.getAttribute('role') ?? '');
    const tagName = await page.evaluate(() => document.activeElement?.tagName?.toLowerCase() ?? '');
    if (
      focused.match(/switch to manual/i) ||
      (tagName === 'button' && focused.match(/manual/i)) ||
      (role === 'button' && focused.match(/manual/i))
    ) {
      found = true;
      break;
    }
  }

  expect(found).toBe(true);
});

// ---------------------------------------------------------------------------
// 5. Keyboard navigation — Tab through form fields in logical order
// ---------------------------------------------------------------------------
test('keyboard nav: Tab through form fields in logical order', async ({ page }) => {
  await page.goto('/');

  // Open the manual form
  await page.getByRole('button', { name: /switch to manual/i }).click();

  // Focus the Room select to establish a known starting point inside the form.
  // This is cross-browser reliable — clicking a vanished button can leave focus
  // on body in Firefox/webkit, making Tab start from the top of the page.
  const roomSelect = page.getByLabel(/room/i);
  await roomSelect.waitFor({ state: 'visible' });
  await roomSelect.focus();

  // The expected Tab order of field labels (case-insensitive substrings).
  // Room is already focused, so we check the fields that follow it via Tab.
  const expectedFieldLabels = ['date', 'start time', 'end time', 'booker'];

  const focusedLabels = [];

  // Tab through enough times to capture all form fields after Room
  for (let i = 0; i < 15; i++) {
    await page.keyboard.press('Tab');

    // Get label text for the currently focused element
    const label = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return '';
      // Check aria-label
      const ariaLabel = el.getAttribute('aria-label');
      if (ariaLabel) return ariaLabel;
      // Check associated label element via htmlFor
      if (el.id) {
        const labelEl = document.querySelector(`label[for="${el.id}"]`);
        if (labelEl) return labelEl.textContent.trim();
      }
      return '';
    });

    if (label) {
      focusedLabels.push(label.toLowerCase());
    }
  }

  // Verify each expected label appears in the collected focus sequence
  for (const expected of expectedFieldLabels) {
    const found = focusedLabels.some((l) => l.includes(expected));
    expect(found, `Expected field with label matching "${expected}" to be reachable via Tab`).toBe(
      true
    );
  }

  // Verify logical order: date before start, start before end, end before booker
  const dateIdx = focusedLabels.findIndex((l) => l.includes('date'));
  const startIdx = focusedLabels.findIndex((l) => l.includes('start'));
  const endIdx = focusedLabels.findIndex((l) => l.includes('end'));
  const bookerIdx = focusedLabels.findIndex((l) => l.includes('booker'));

  if (dateIdx !== -1 && startIdx !== -1) {
    expect(dateIdx).toBeLessThan(startIdx);
  }
  if (startIdx !== -1 && endIdx !== -1) {
    expect(startIdx).toBeLessThan(endIdx);
  }
  if (endIdx !== -1 && bookerIdx !== -1) {
    expect(endIdx).toBeLessThan(bookerIdx);
  }
});
