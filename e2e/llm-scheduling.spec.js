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
    const capturedBodies = [];

    let callCount = 0;

    // Intercept /api/chat and capture the request bodies
    await page.route('/api/chat', async (route) => {
      const request = route.request();
      const body = request.postDataJSON();
      capturedBodies.push(body);

      callCount += 1;

      if (callCount === 1) {
        // First turn: assistant parses the date and returns parsedFields with start_utc
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            assistantMessage: 'Got it — May 10 at 9 AM in Nevada. Shall I confirm?',
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
        // Second turn: assistant confirms
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            assistantMessage: 'Nevada is booked for May 10 at 9 AM.',
            parsedFields: {
              room_id: 'nevada',
              start_utc: '2026-05-10T06:00:00Z',
              end_utc: '2026-05-10T07:00:00Z',
              booker_name: 'Alice',
              description: null,
              timeAdjusted: false,
            },
            status: 'ready-to-confirm',
          }),
        });
      }
    });

    await page.goto('/');

    // Turn 1: user sends first message
    const textarea = page.getByRole('textbox');
    await textarea.fill('Book Nevada on May 10 at 9am for 1 hour');
    await page.getByRole('button', { name: /send/i }).click();

    // Wait for the assistant's first response to appear
    await expect(page.getByText(/May 10.*Nevada|Nevada.*May 10|Got it.*May 10/i)).toBeVisible({
      timeout: 10000,
    });

    // Turn 2: user confirms
    await textarea.fill('Yes, book it for Alice');
    await page.getByRole('button', { name: /send/i }).click();

    // Wait for the second response to appear
    await expect(page.getByText(/Nevada is booked/i)).toBeVisible({ timeout: 10000 });

    // FR-LLM-1 assertion: the second POST body must include the previous
    // assistant message containing parsedFields (with start_utc)
    expect(capturedBodies.length).toBeGreaterThanOrEqual(2);

    const secondPostBody = capturedBodies[1];
    expect(Array.isArray(secondPostBody.messages)).toBe(true);

    // Find an assistant message that carries parsedFields with start_utc
    const assistantWithParsedFields = secondPostBody.messages.find(
      (msg) => msg.role === 'assistant' && msg.parsedFields && msg.parsedFields.start_utc
    );

    expect(assistantWithParsedFields).toBeDefined();
    expect(assistantWithParsedFields.parsedFields.start_utc).toBeTruthy();
  });
});
