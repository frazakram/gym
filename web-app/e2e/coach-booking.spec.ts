import { test, expect } from '@playwright/test';
import { bookDefaultCoachViaApi, openFromProfile, registerViaApi, saveProfileViaApi } from './helpers';

// Needs the server started with DEFAULT_COACH_PHONE and DEFAULT_COACH_EMAIL set.
test('coach booking: a user can cancel their booking from the Coach view', async ({ page }) => {
  await registerViaApi(page, 'coachbook');
  await saveProfileViaApi(page);
  const bookingId = await bookDefaultCoachViaApi(page);

  await page.goto('/dashboard');
  await openFromProfile(page, 'Coach');

  const cancelRequest = page.waitForResponse(
    (response) => response.url().endsWith(`/api/coach/bookings/${bookingId}`) && response.request().method() === 'PATCH',
  );
  await page.getByRole('button', { name: 'Cancel booking' }).first().click();
  expect((await cancelRequest).status()).toBe(200);
  await expect(page.getByText('Booking cancelled.')).toBeVisible();

  const bookings = await (await page.request.get('/api/coach/bookings')).json();
  expect(JSON.stringify(bookings)).toContain('"status":"cancelled"');
});
