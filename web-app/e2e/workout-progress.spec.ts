import { test, expect } from '@playwright/test';
import { openTab, registerViaApi, restWeekRoutine, saveProfileViaApi, saveRoutineViaApi } from './helpers';

// Characterization of the workout-progress handlers in DashboardClient
// (logging a set, marking a rest day complete), checked against the server.

test('logging weight x reps marks the exercise done and saves the numbers', async ({ page }) => {
  await registerViaApi(page, 'logset');
  await saveProfileViaApi(page);
  const routineId = await saveRoutineViaApi(page);

  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Start Workout' }).click();
  await page.getByLabel('Weight for Goblet Squat').fill('60');
  await page.getByLabel('Reps for Goblet Squat').fill('8');

  // The inputs also save on blur (weight-only when focus moves to reps), so wait
  // for the save that carries both numbers before checking the server.
  const savedWithReps = page.waitForResponse(
    (r) =>
      r.url().endsWith('/api/completions') &&
      r.request().method() === 'POST' &&
      r.request().postDataJSON()?.actual_reps === 8,
  );
  await page.getByRole('button', { name: 'Log', exact: true }).first().click();
  const saveResponse = await savedWithReps;
  expect(saveResponse.request().postDataJSON()).toMatchObject({ exerciseIndex: 0, completed: true, actual_weight: 60, actual_reps: 8 });
  expect(saveResponse.status()).toBe(200);
  await expect(page.getByText('saved', { exact: true }).first()).toBeVisible();

  const { completions } = await (await page.request.get(`/api/completions?routineId=${routineId}`)).json();
  expect(completions).toEqual([
    expect.objectContaining({ exercise_index: 0, completed: true, actual_weight: 60, actual_reps: 8 }),
  ]);
});

test('a rest day can be marked complete from the Routine view and stays complete', async ({ page }) => {
  await registerViaApi(page, 'restday');
  await saveProfileViaApi(page);
  const routineId = await saveRoutineViaApi(page, restWeekRoutine());

  await page.goto('/dashboard');
  await openTab(page, 'Train');

  const saved = page.waitForResponse((r) => r.url().endsWith('/api/day-completions') && r.request().method() === 'POST');
  await page.getByRole('button', { name: 'Mark as Complete' }).click();
  expect((await saved).status()).toBe(200);
  await expect(page.getByRole('button', { name: 'Completed', exact: true })).toBeVisible();

  const { days } = await (await page.request.get(`/api/day-completions?routineId=${routineId}`)).json();
  expect(days).toEqual([expect.objectContaining({ completed: true })]);

  await page.reload();
  await openTab(page, 'Train');
  await expect(page.getByRole('button', { name: 'Completed', exact: true })).toBeVisible();
});
