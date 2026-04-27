/**
 * E2E tests: LLM Scheduling Brain — FR-LLM-1
 *
 * UI test: navigate in beforeEach (matching chat-ui.spec.js pattern so health
 * mock is active before the page is first loaded). Chat mock is registered in
 * the test body before the user sends a message.
 *
 * Backend API test: uses the `request` fixture to call Express directly.
 */

import { test, expect } from '@playwright/test';

test.describe('LLM Scheduling Brain — multi-turn conversation', () => {
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

  test('first turn: ready-to-confirm response renders confirm card in chat', async ({ page }) => {
    await page.route('/api/chat', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          assistantMessage: 'Nevada on May 10 at 9 AM for 1 hour. Shall I confirm?',
          parsedFields: {
            room_id: 'nevada',
            start_utc: '2026-05-10T06:00:00Z',
            end_utc: '2026-05-10T07:00:00Z',
            booker_name: null,
            description: null,
            timeAdjusted: false,
          },
          status: 'ready-to-confirm',
        }),
      });
    });

    const textarea = page.getByRole('textbox');
    await textarea.fill('Book Nevada on May 10 at 9am for 1 hour');

    const sendButton = page.getByRole('button', { name: /send/i });
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    // User message should appear in history
    await expect(page.getByText('Book Nevada on May 10 at 9am for 1 hour')).toBeVisible({
      timeout: 10000,
    });

    // Confirm card renders (has a Confirm booking button)
    await expect(page.getByRole('button', { name: /confirm booking/i })).toBeVisible({
      timeout: 15000,
    });
  });

  test('backend: POST /api/chat with parsedFields in history is accepted', async ({ request }) => {
    const res = await request.post('http://localhost:3001/api/chat', {
      data: {
        messages: [
          { role: 'user', content: 'Book Nevada on May 10' },
          {
            role: 'assistant',
            content: 'Got it',
            parsedFields: {
              start_utc: '2026-05-10T06:00:00Z',
              end_utc: '2026-05-10T07:00:00Z',
              room_id: 'nevada',
            },
          },
          { role: 'user', content: 'Yes, for Alice' },
        ],
      },
    });

    // 200 = LLM responded; 503 = no API key in CI — both are acceptable
    expect([200, 503]).toContain(res.status());
  });
});
