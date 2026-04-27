/**
 * E2E test: LLM Scheduling Brain — FR-LLM-1
 *
 * Multi-turn conversation where the date is established in turn 1
 * and the full conversation history (including parsedFields) is forwarded
 * in turn 2. Uses mocked /api/chat responses — no real LLM key required.
 */

import { test, expect } from '@playwright/test';

test.describe('LLM Scheduling Brain — multi-turn conversation', () => {
  test.beforeEach(async ({ page }) => {
    // Stub /api/health so the Chat UI renders without restriction
    await page.route('/api/health', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, llmAvailable: true, dailyCapRemaining: 500 }),
      });
    });
  });

  test('second POST /api/chat includes previous assistant parsedFields in messages array', async ({
    page,
  }) => {
    let callCount = 0;
    let secondPostBody = null;

    await page.route('/api/chat', async (route) => {
      callCount += 1;

      if (callCount === 1) {
        // Capture first request body (not needed here) and respond with parsedFields
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            assistantMessage: 'Got it — Nevada on May 10 at 9 AM. Shall I confirm?',
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
      } else {
        // Capture the second request body before responding
        secondPostBody = route.request().postDataJSON();
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            assistantMessage: 'Nevada is booked for May 10 at 9 AM.',
            parsedFields: null,
            status: 'needs-info',
          }),
        });
      }
    });

    await page.goto('/');

    // Turn 1
    const textarea = page.getByRole('textbox');
    await textarea.fill('Book Nevada on May 10 at 9am for 1 hour');
    const sendButton = page.getByRole('button', { name: /send/i });
    await expect(sendButton).toBeEnabled();
    await sendButton.click();

    // Wait for the first assistant response to render
    await expect(page.getByText(/Nevada.*May 10|Got it.*Nevada/i)).toBeVisible({
      timeout: 15000,
    });

    // Turn 2: wait for button to be enabled, then send second message
    await textarea.fill('Yes, book it for Alice');
    await expect(sendButton).toBeEnabled({ timeout: 5000 });
    await sendButton.click();

    // Wait for the second assistant response
    await expect(page.getByText(/Nevada is booked/i)).toBeVisible({ timeout: 15000 });

    // FR-LLM-1 assertion: the second POST body must include the previous
    // assistant message with parsedFields.start_utc
    expect(callCount).toBeGreaterThanOrEqual(2);
    expect(secondPostBody).not.toBeNull();
    expect(Array.isArray(secondPostBody.messages)).toBe(true);

    const assistantWithParsedFields = secondPostBody.messages.find(
      (msg) => msg.role === 'assistant' && msg.parsedFields && msg.parsedFields.start_utc
    );

    expect(assistantWithParsedFields).toBeDefined();
    expect(assistantWithParsedFields.parsedFields.start_utc).toBeTruthy();
  });
});
