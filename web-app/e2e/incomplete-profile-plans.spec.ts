import { test, expect } from '@playwright/test';
import { registerViaApi } from './helpers';

// A user who skipped onboarding has an empty profile; the dashboard shows
// display defaults (25 yrs, 70 kg, 170 cm) for it. Generating a plan used to
// send those placeholders to the AI as if they were the user's.
test('generating a routine with an incomplete profile asks for the profile instead', async ({ page }) => {
  await registerViaApi(page, 'noplan');
  await page.goto('/onboarding');
  await page.getByRole('button', { name: /Skip for now/ }).click();
  await page.waitForURL(/\/dashboard$/);
  await page.waitForLoadState('networkidle');

  const generationRequests: string[] = [];
  page.on('request', (request) => {
    if (request.url().includes('/api/routine/generate')) generationRequests.push(request.url());
  });

  await page.getByRole('button', { name: 'Generate My Routine' }).first().click();

  // Errors show as a toast and an "Oops!" dialog (existing dashboard behaviour).
  await expect(page.getByText(/Complete your profile/).first()).toBeVisible();
  await expect(page.getByRole('navigation').getByRole('button', { name: 'Profile', exact: true })).toHaveAttribute('aria-current', 'page');
  expect(generationRequests).toHaveLength(0);
});
