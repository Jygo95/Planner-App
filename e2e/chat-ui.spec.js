import { test, expect } from '@playwright/test';

test.describe('Chat UI', () => {
  test.beforeEach(async ({ page }) => {
    // Default: LLM available so ChatInput is visible in CI (no API key set there)
    await page.route('/api/health', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, llmAvailable: true, dailyCapRemaining: 500 }),
      });
    });
    await page.goto('/');
  });

  test('chat textarea is visible on page load', async ({ page }) => {
    await expect(page.getByRole('textbox')).toBeVisible();
  });

  test('send button is disabled when textarea is empty', async ({ page }) => {
    const textarea = page.getByRole('textbox');
    await expect(textarea).toHaveValue('');
    const sendButton = page.getByRole('button', { name: /send/i });
    await expect(sendButton).toBeDisabled();
  });

  test('typing a message and sending shows it in chat history', async ({ page }) => {
    // Mock the /api/chat endpoint so the test does not require a real backend
    await page.route('/api/chat', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ reply: 'I can help with that!' }),
      });
    });

    const textarea = page.getByRole('textbox');
    await textarea.fill('Book Nevada tomorrow 2–3pm for Alice');

    const sendButton = page.getByRole('button', { name: /send/i });
    await expect(sendButton).not.toBeDisabled();
    await sendButton.click();

    // User message appears in history
    await expect(page.getByText('Book Nevada tomorrow 2–3pm for Alice')).toBeVisible();

    // Assistant response appears in history
    await expect(page.getByText('I can help with that!')).toBeVisible();
  });

  test('300-char limit: textarea does not accept more than 300 characters', async ({ page }) => {
    const textarea = page.getByRole('textbox');
    const over300 = 'a'.repeat(310);
    await textarea.fill(over300);
    const value = await textarea.inputValue();
    expect(value.length).toBeLessThanOrEqual(300);
  });

  test('character counter reflects number of characters typed', async ({ page }) => {
    const textarea = page.getByRole('textbox');
    await textarea.fill('hello');
    await expect(page.getByText('5 / 300')).toBeVisible();
  });

  test('LLM-down banner shown when health returns llmAvailable: false', async ({ page }) => {
    // Mock health endpoint to return llmAvailable: false BEFORE navigating
    await page.route('/api/health', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ ok: true, llmAvailable: false, dailyCapRemaining: 0 }),
      });
    });

    await page.goto('/');

    await expect(page.getByText(/AI assistant unavailable/i)).toBeVisible();
  });

  test('send button becomes enabled when textarea has text', async ({ page }) => {
    const textarea = page.getByRole('textbox');
    const sendButton = page.getByRole('button', { name: /send/i });

    await expect(sendButton).toBeDisabled();
    await textarea.fill('some text');
    await expect(sendButton).not.toBeDisabled();
  });
});
