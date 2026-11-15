import { test, expect } from '@playwright/test';
import {
  PASSWORD,
  greeting,
  loginViaUi,
  openProfileTab,
  registerViaApi,
  saveProfileViaApi,
  saveRoutineViaApi,
  uniqueUsername,
} from './helpers';

// Main user journeys, end to end through the real UI + API + database.
// Deterministic: no AI calls (routines are seeded through the API).

test.describe('Core journeys', () => {
  test('new user: register in the UI lands on onboarding; "Skip" bounces back (current behaviour)', async ({ page }) => {
    const username = uniqueUsername('journey');
    await page.goto('/login');
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await page.getByPlaceholder('Enter your email or username').fill(username);
    await page.getByPlaceholder('Enter your password').fill(PASSWORD);
    await page.getByRole('button', { name: 'Create Account' }).click();

    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByText('Your Goal', { exact: true }).first()).toBeVisible();

    // Known UX bug (AUDIT backlog): "Skip for now" routes to /dashboard, which sees no
    // profile and immediately router.replace()s back to /onboarding, so a new user
    // cannot actually skip. Pinned here so a fix is a deliberate, visible change.
    const visited: string[] = [];
    page.on('framenavigated', (f) => {
      if (f === page.mainFrame()) visited.push(new URL(f.url()).pathname);
    });
    await page.getByRole('button', { name: /Skip for now/ }).click();
    await expect.poll(() => visited).toContain('/dashboard');
    await expect(page).toHaveURL(/\/onboarding/);
    await expect(page.getByText('Your Goal', { exact: true }).first()).toBeVisible();
  });

  test('returning user with a profile: UI login -> dashboard greeting', async ({ page }) => {
    const { username } = await registerViaApi(page, 'returning');
    await saveProfileViaApi(page);
    await page.context().clearCookies();

    await loginViaUi(page, username);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(greeting(page)).toBeVisible();
  });

  test('logout returns to login and protects the dashboard', async ({ page }) => {
    await registerViaApi(page, 'logout');
    await saveProfileViaApi(page);
    await page.goto('/dashboard');
    await expect(greeting(page)).toBeVisible();

    await openProfileTab(page);
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login/);

    await page.goto('/dashboard');
    await expect(page).toHaveURL(/\/login/);
  });

  test("workout: start today's workout, mark an exercise done, and it persists", async ({ page }) => {
    await registerViaApi(page, 'workout');
    await saveProfileViaApi(page);
    await saveRoutineViaApi(page);

    await page.goto('/dashboard');
    await page.getByRole('button', { name: 'Start Workout' }).click();

    const markSquat = page.getByRole('button', { name: 'Mark Goblet Squat as complete' });
    await expect(markSquat).toBeVisible();
    const saved = page.waitForResponse(
      (r) => r.url().includes('/api/completions') && r.request().method() === 'POST',
    );
    await markSquat.click();
    expect((await saved).status()).toBe(200);

    await page.reload();
    await page.getByRole('button', { name: 'Start Workout' }).click();
    await expect(page.getByRole('button', { name: 'Mark Goblet Squat as incomplete' })).toBeVisible();
  });
});
