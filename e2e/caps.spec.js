/**
 * Playwright E2E tests for caps-and-limits (FR-CHAT-4 + FR-CHAT-5)
 *
 * Session cap (FR-CHAT-4):
 *   - Banner appears with "interactions left" text after 5 interactions
 *   - Chat input is disabled/replaced after 10 interactions
 *
 * Daily cap (FR-CHAT-5):
 *   - LLM-unavailable banner visible when dailyCapRemaining: 0
 */

import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// Helper — send one message and wait for assistant reply to appear
// ---------------------------------------------------------------------------

async function sendOneMessage(page, text) {
  const textarea = page.getByRole('textbox');
  await textarea.fill(text);
  const sendButton = page.getByRole('button', { name: /send/i });
  await sendButton.click();
  // Wait for loading to finish (button re-enabled or assistant text appears)
  await page.waitForTimeout(300);
}

// ---------------------------------------------------------------------------
// beforeEach: mock /api/health so LLM is shown as available, navigate to /
// ---------------------------------------------------------------------------

test.beforeEach(async ({ page }) => {
  await page.route('/api/health', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, llmAvailable: true, dailyCapRemaining: 500 }),
    });
  });
  await page.goto('/');
});

// ---------------------------------------------------------------------------
// Test 1 — 5 interactions → interaction banner appears
// ---------------------------------------------------------------------------

test('banner containing "interactions left" appears after 5 interactions', async ({ page }) => {
  // Mock /api/chat for all calls
  await page.route('/api/chat', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reply: 'I can help with that!' }),
    });
  });

  // Send 5 messages
  for (let i = 1; i <= 5; i++) {
    await sendOneMessage(page, `Book room ${i}`);
  }

  // Banner must appear with "interactions left" copy
  await expect(page.getByText(/interactions left/i)).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// Test 2 — 10 interactions → chat input disabled or replaced
// ---------------------------------------------------------------------------

test('chat input is disabled after 10 interactions', async ({ page }) => {
  await page.route('/api/chat', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reply: 'Got it.' }),
    });
  });

  // Send 10 messages
  for (let i = 1; i <= 10; i++) {
    await sendOneMessage(page, `Message ${i}`);
  }

  // Either the textarea is disabled, or the session-limit message replaces it
  const textarea = page.getByRole('textbox');
  const sessionLimitText = page.getByText(/You've reached the session limit/i);

  // At least one of these conditions must be true
  const textareaDisabled = await textarea.isDisabled().catch(() => false);
  const sessionLimitVisible = await sessionLimitText.isVisible().catch(() => false);

  expect(textareaDisabled || sessionLimitVisible).toBe(true);
});

// ---------------------------------------------------------------------------
// Test 3 — session limit message copy is exact when at cap
// ---------------------------------------------------------------------------

test('session-limit message shown with exact copy at 10 interactions', async ({ page }) => {
  await page.route('/api/chat', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reply: 'OK' }),
    });
  });

  for (let i = 1; i <= 10; i++) {
    await sendOneMessage(page, `Turn ${i}`);
  }

  await expect(
    page.getByText(
      "You've reached the session limit. Please refresh the page or use the manual form."
    )
  ).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// Test 4 — system-wide LLM unavailable banner when dailyCapRemaining is 0
// ---------------------------------------------------------------------------

test('system-wide banner shown when dailyCapRemaining is 0 (llmAvailable: false)', async ({
  page,
}) => {
  // Override health mock set in beforeEach — re-route before navigating
  await page.route('/api/health', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ ok: true, llmAvailable: false, dailyCapRemaining: 0 }),
    });
  });

  await page.goto('/');

  await expect(page.getByText(/AI assistant unavailable/i)).toBeVisible({ timeout: 5000 });
});

// ---------------------------------------------------------------------------
// Test 5 — banner shows correct countdown at interaction 6 (4 left)
// ---------------------------------------------------------------------------

test('banner shows "4 interactions left" after 6 interactions', async ({ page }) => {
  await page.route('/api/chat', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ reply: 'Sure!' }),
    });
  });

  for (let i = 1; i <= 6; i++) {
    await sendOneMessage(page, `Message ${i}`);
  }

  await expect(page.getByText(/4 interactions left/i)).toBeVisible({ timeout: 5000 });
});
