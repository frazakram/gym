import { test, expect } from '@playwright/test';
import { openProfileTab, registerViaApi, saveProfileViaApi } from './helpers';

// Profiles are created in /onboarding (see journeys.spec.ts); this spec covers
// editing an existing profile from the dashboard's Profile tab.
test.describe('Profile Management', () => {
  test.beforeEach(async ({ page }) => {
    await registerViaApi(page, 'prof');
    await saveProfileViaApi(page, { age: 25 });
    await page.goto('/dashboard');
    await openProfileTab(page);
  });

  const ageInput = (page: import('@playwright/test').Page) => page.locator('input[min="16"][max="100"]');

  // TC-PROF-001: Edit and save
  test('Edit profile and save; the change persists', async ({ page }) => {
    await expect(ageInput(page)).toHaveValue('25');
    await ageInput(page).fill('31');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Profile saved successfully')).toBeVisible();

    const res = await page.request.get('/api/profile');
    expect((await res.json()).profile.age).toBe(31);
  });

  // TC-PROF-003: Missing required field
  test('Validation blocks saving without a required field', async ({ page }) => {
    await ageInput(page).fill('');
    await page.getByRole('button', { name: 'Save changes' }).click();

    await expect(page.getByText('Profile saved successfully')).not.toBeVisible();
    const res = await page.request.get('/api/profile');
    expect((await res.json()).profile.age).toBe(25);
  });
});
