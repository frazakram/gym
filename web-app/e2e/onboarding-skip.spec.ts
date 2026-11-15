import { test, expect } from '@playwright/test';
import { openProfileTab, registerViaApi } from './helpers';

// "Skip for now" used to route to /dashboard, which sends a profile-less user
// straight back to /onboarding: new users could not skip.
test('a new user can skip onboarding and stay on the dashboard', async ({ page }) => {
  await registerViaApi(page, 'skipper');
  await page.goto('/onboarding');

  await page.getByRole('button', { name: /Skip for now/ }).click();
  await expect(page).toHaveURL(/\/dashboard$/);

  // Still there once the dashboard has loaded its data, and after a reload.
  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/dashboard$/);
  await page.reload({ waitUntil: 'networkidle' });
  await expect(page).toHaveURL(/\/dashboard$/);

  // The profile they will fill in later opens without errors.
  await openProfileTab(page);
  await expect(page.getByText(/something went wrong/i)).toHaveCount(0);
});
