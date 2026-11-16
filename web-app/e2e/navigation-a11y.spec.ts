import { test, expect } from '@playwright/test';
import { openFromProfile, openTab, registerViaApi, saveProfileViaApi, saveRoutineViaApi } from './helpers';

// The bottom navigation is the Navy and Pink design's four tabs. Every tab has
// an accessible name, and the current tab stays marked on the screens it owns.
test('the four tabs are named, and the current one stays marked on its sub-screens', async ({ page }) => {
  await registerViaApi(page, 'a11ynav');
  await saveProfileViaApi(page);
  await saveRoutineViaApi(page);
  await page.goto('/dashboard', { waitUntil: 'networkidle' });

  const nav = page.getByRole('navigation');
  for (const name of ['Today', 'Train', 'Eat', 'Profile']) {
    await expect(nav.getByRole('button', { name, exact: true })).toBeVisible();
  }
  const current = nav.locator('[aria-current="page"]');
  await expect(current).toHaveCount(1);
  await expect(current).toHaveText('Today');

  // Starting the workout from Today belongs to Train.
  await page.getByRole('button', { name: 'Start Workout' }).click();
  await expect(current).toHaveText('Train');

  await openTab(page, 'Eat');
  await expect(current).toHaveText('Eat');
  await page.getByRole('button', { name: 'Meal plan', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Diet plan' })).toBeVisible();
  await expect(current).toHaveText('Eat');

  await openFromProfile(page, 'Progress');
  await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible();
  await expect(current).toHaveText('Profile');
  await page.getByRole('button', { name: 'Go back' }).click();
  await expect(page.getByRole('list', { name: 'More' })).toBeVisible();
});
