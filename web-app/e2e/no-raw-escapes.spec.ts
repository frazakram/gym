import { test, expect } from '@playwright/test';
import { registerViaApi, saveProfileViaApi, saveRoutineViaApi } from './helpers';

// In a JSX attribute string (subtitle="... • ..."), escapes are not
// interpreted, so users saw a literal "•" on the Home coach card.
const RAW_ESCAPE = /\\u[0-9a-fA-F]{4}/;

test('the dashboard home shows no raw unicode escape codes', async ({ page }) => {
  await registerViaApi(page, 'escapes');
  await saveProfileViaApi(page);
  await saveRoutineViaApi(page);
  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  await expect(page.getByText('Personal Coach')).toBeVisible();

  expect(await page.locator('body').innerText()).not.toMatch(RAW_ESCAPE);
});
