import { test, expect } from '@playwright/test';
import { csrfHeader, openFromProfile, registerViaApi, saveProfileViaApi, saveRoutineViaApi } from './helpers';

test('Progress shows completed exercises as minutes, for the week and the month', async ({ page }) => {
  await registerViaApi(page, 'progress');
  await saveProfileViaApi(page);
  const routineId = await saveRoutineViaApi(page);
  // Two exercises done today: 2 x 8 estimated minutes of strength.
  for (const exerciseIndex of [0, 1]) {
    const res = await page.request.post('/api/completions', {
      data: { routineId, dayIndex: 0, exerciseIndex, completed: true },
      headers: await csrfHeader(page),
    });
    expect(res.status(), await res.text()).toBe(200);
  }

  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await openFromProfile(page, 'Progress');

  await expect(page.getByText('min this week')).toBeVisible();
  const kpis = page.locator('.gb-kpis');
  await expect(kpis.getByText('Strength min').locator('..')).toContainText('16');
  await expect(kpis.getByText('Active days').locator('..')).toContainText('1');
  await expect(page.getByRole('img', { name: /^Today: 16 minutes strength, 0 minutes cardio/ })).toBeVisible();

  await page.getByRole('group', { name: 'Range' }).getByRole('button', { name: 'Month' }).click();
  await expect(page.getByText('min this month')).toBeVisible();
  await expect(page.getByRole('img', { name: /^This wk: 16 minutes strength/ })).toBeVisible();

  // The same numbers are available as a table.
  await page.getByText('View as table').click();
  await expect(page.getByRole('row', { name: /This wk 16 min 0 min 16 min/ })).toBeVisible();
});
