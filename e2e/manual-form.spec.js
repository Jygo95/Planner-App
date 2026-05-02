import { test, expect } from '@playwright/test';

test.describe('Manual Form', () => {
  test('clicking "Switch to manual" makes the form visible', async ({ page }) => {
    await page.goto('/');
    const switchLink = page.getByText(/switch to manual/i);
    await expect(switchLink).toBeVisible();
    await switchLink.click();
    await expect(page.getByRole('combobox', { name: /room/i })).toBeVisible();
  });

  test('filling all required fields and submitting shows ConfirmationCard', async ({ page }) => {
    await page.goto('/');
    await page.getByText(/switch to manual/i).click();

    await page.getByLabel(/room/i).selectOption('california');
    await page.getByLabel(/date/i).fill('2026-05-15');
    await page.getByLabel(/start time/i).fill('09:00');
    await page.getByLabel(/end time/i).fill('10:00');
    await page.getByLabel(/booker name/i).fill('Alice');

    await page.getByRole('button', { name: /preview|submit|confirm/i }).click();

    await expect(page.getByTestId('confirmation-card')).toBeVisible();
  });

  test('clicking Cancel on ConfirmationCard returns to the form', async ({ page }) => {
    await page.goto('/');
    await page.getByText(/switch to manual/i).click();

    await page.getByLabel(/room/i).selectOption('nevada');
    await page.getByLabel(/date/i).fill('2026-05-16');
    await page.getByLabel(/start time/i).fill('14:00');
    await page.getByLabel(/end time/i).fill('15:00');
    await page.getByLabel(/booker name/i).fill('Bob');

    await page.getByRole('button', { name: /preview|submit|confirm/i }).click();
    await expect(page.getByTestId('confirmation-card')).toBeVisible();

    await page.getByRole('button', { name: /cancel/i }).click();

    await expect(page.getByTestId('confirmation-card')).not.toBeVisible();
    await expect(page.getByRole('combobox', { name: /room/i })).toBeVisible();
  });
});
