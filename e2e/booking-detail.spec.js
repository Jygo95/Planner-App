import { test, expect } from '@playwright/test';

test.describe('Booking Detail Panel', () => {
  let createdBookingId;

  test.beforeEach(async ({ request, page }) => {
    // Seed a booking via the API before each test
    const response = await request.post('http://localhost:3001/api/bookings', {
      data: {
        room_id: 'california',
        start_utc: '2026-05-10T09:00:00.000Z',
        end_utc: '2026-05-10T10:30:00.000Z',
        booker_name: 'DetailTestUser',
        description: 'E2E detail test booking',
      },
    });
    expect(response.status()).toBe(201);
    const booking = await response.json();
    createdBookingId = booking.id;

    // Navigate to the app with the correct date in view
    await page.goto('/?date=2026-05-10');
  });

  test.afterEach(async ({ request }) => {
    // Clean up the booking if it still exists
    if (createdBookingId) {
      await request
        .delete(`http://localhost:3001/api/bookings/${createdBookingId}`)
        .catch(() => {});
    }
  });

  test('clicking a booking block opens the detail panel', async ({ page }) => {
    // Wait for day view to be visible
    await expect(page.locator('[data-testid="day-view"]')).toBeVisible();

    // Find and click the booking block for our seeded booking
    const bookingBlock = page.locator(`[data-testid="booking-block-${createdBookingId}"]`);
    await expect(bookingBlock).toBeVisible({ timeout: 5000 });
    await bookingBlock.click();

    // Detail panel should appear
    await expect(page.locator('[data-testid="booking-detail-panel"]')).toBeVisible();
  });

  test('detail panel shows the booker name', async ({ page }) => {
    await expect(page.locator('[data-testid="day-view"]')).toBeVisible();

    const bookingBlock = page.locator(`[data-testid="booking-block-${createdBookingId}"]`);
    await expect(bookingBlock).toBeVisible({ timeout: 5000 });
    await bookingBlock.click();

    await expect(page.locator('[data-testid="booking-detail-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="booking-detail-panel"]')).toContainText(
      'DetailTestUser'
    );
  });

  test('clicking "Cancel booking" shows confirmation prompt', async ({ page }) => {
    await expect(page.locator('[data-testid="day-view"]')).toBeVisible();

    const bookingBlock = page.locator(`[data-testid="booking-block-${createdBookingId}"]`);
    await expect(bookingBlock).toBeVisible({ timeout: 5000 });
    await bookingBlock.click();

    await expect(page.locator('[data-testid="booking-detail-panel"]')).toBeVisible();

    await page.getByRole('button', { name: /cancel booking/i }).click();

    await expect(page.getByText(/cancel this booking\?/i)).toBeVisible();
  });

  test('confirming cancel removes the booking from the calendar', async ({ page }) => {
    await expect(page.locator('[data-testid="day-view"]')).toBeVisible();

    const bookingBlock = page.locator(`[data-testid="booking-block-${createdBookingId}"]`);
    await expect(bookingBlock).toBeVisible({ timeout: 5000 });
    await bookingBlock.click();

    await expect(page.locator('[data-testid="booking-detail-panel"]')).toBeVisible();

    // Click cancel booking
    await page.getByRole('button', { name: /cancel booking/i }).click();
    await expect(page.getByText(/cancel this booking\?/i)).toBeVisible();

    // Confirm cancellation
    await page.getByRole('button', { name: /yes,? cancel it/i }).click();

    // Panel should close
    await expect(page.locator('[data-testid="booking-detail-panel"]')).not.toBeVisible({
      timeout: 5000,
    });

    // Booking block should be gone from the calendar
    await expect(page.locator(`[data-testid="booking-block-${createdBookingId}"]`)).not.toBeVisible(
      { timeout: 5000 }
    );

    // Mark as deleted so afterEach skip cleanup
    createdBookingId = null;
  });
});
