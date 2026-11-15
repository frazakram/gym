import { test, expect } from '@playwright/test';
import { registerViaApi, saveProfileViaApi } from './helpers';

// Inactive bottom-nav tabs and the centre menu button were icon-only with no
// accessible name: screen readers announced them as just "button".
test('every bottom navigation button has a name screen readers can announce', async ({ page }) => {
  await registerViaApi(page, 'a11ynav');
  await saveProfileViaApi(page);
  await page.goto('/dashboard', { waitUntil: 'networkidle' });

  const nav = page.getByRole('navigation');
  for (const name of ['Home', 'Routine', 'Workout', 'Profile']) {
    await expect(nav.getByRole('button', { name, exact: true })).toBeVisible();
  }
  await expect(nav.getByRole('button', { name: 'Home', exact: true })).toHaveAttribute('aria-current', 'page');

  const menuButton = nav.getByRole('button', { name: 'Open menu' });
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');
  await menuButton.click();
  await expect(nav.getByRole('button', { name: 'Close menu' })).toHaveAttribute('aria-expanded', 'true');

  await nav.getByRole('button', { name: 'Close menu' }).click();
  await expect(nav.getByRole('button', { name: 'Open menu' })).toHaveAttribute('aria-expanded', 'false');

  // Navigating by name works and moves the "current page" marker.
  await nav.getByRole('button', { name: 'Profile', exact: true }).click();
  await expect(nav.getByRole('button', { name: 'Profile', exact: true })).toHaveAttribute('aria-current', 'page');
});
