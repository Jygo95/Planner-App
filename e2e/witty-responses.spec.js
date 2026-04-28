import { test, expect } from '@playwright/test';

test.describe('Witty Responses', () => {
  test.beforeEach(async ({ page }) => {
    // Stable health mock so ChatInput is visible
    await page.route('/api/health', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, llmAvailable: true, dailyCapRemaining: 500 }),
      });
    });
    await page.goto('/');
  });

  test('too-short booking request shows witty assistant response', async ({ page }) => {
    await page.route('/api/chat', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          assistantMessage: "Five minutes? That's barely a coffee run.",
          status: 'parse-failure',
          error: 'too-short',
        }),
      });
    });

    const textarea = page.getByRole('textbox');
    await textarea.fill('Book a room for 5 minutes');

    const sendButton = page.getByRole('button', { name: /send/i });
    await sendButton.click();

    await expect(page.getByText("Five minutes? That's barely a coffee run.")).toBeVisible();
  });

  test('too-far booking request shows witty assistant response', async ({ page }) => {
    await page.route('/api/chat', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          assistantMessage: 'Booking 200 days out? Bold. We only go 90 days ahead.',
          status: 'parse-failure',
          error: 'too-far',
        }),
      });
    });

    const textarea = page.getByRole('textbox');
    await textarea.fill('Book a room 200 days from now');

    const sendButton = page.getByRole('button', { name: /send/i });
    await sendButton.click();

    await expect(
      page.getByText('Booking 200 days out? Bold. We only go 90 days ahead.')
    ).toBeVisible();
  });
});
