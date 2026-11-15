import { test, expect } from '@playwright/test';
import { registerViaApi, saveProfileViaApi, saveRoutineViaApi } from './helpers';

// The dashboard opens on Home; the other nine views load on demand
// (components/views/lazy-views.tsx). With every view in the first load the
// dashboard downloaded 934 KB of JavaScript; split, 735 KB.
const DASHBOARD_FIRST_LOAD_JS_BUDGET_KB = 800;

test('dashboard first load stays within the JavaScript budget', async ({ page }) => {
  await registerViaApi(page, 'jsbudget');
  await saveProfileViaApi(page);
  await saveRoutineViaApi(page);

  const scriptBytes = new Map<string, number>();
  page.on('response', async (response) => {
    if (response.request().resourceType() !== 'script') return;
    const body = await response.body().catch(() => Buffer.alloc(0));
    scriptBytes.set(new URL(response.url()).pathname, body.length);
  });

  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await expect(page.getByRole('button', { name: 'Start Workout' })).toBeVisible();

  const totalKb = [...scriptBytes.values()].reduce((sum, bytes) => sum + bytes, 0) / 1024;
  expect(totalKb).toBeLessThan(DASHBOARD_FIRST_LOAD_JS_BUDGET_KB);
});
