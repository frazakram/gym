import { test, expect } from '@playwright/test';
import { registerViaApi, saveProfileViaApi } from './helpers';

const PHOTO = {
  id: 'e2e-photo-1',
  base64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  content_type: 'image/png',
  size_bytes: 68,
  uploaded_at: new Date().toISOString(),
};

test('body photos load in the Body view (served separately from the profile)', async ({ page }) => {
  await registerViaApi(page, 'bodyphoto');
  await saveProfileViaApi(page, { body_photos: [PHOTO] });

  await page.goto('/dashboard');
  await page.locator('nav button:has(svg.lucide-plus)').first().click();
  await page.getByRole('button', { name: 'Body', exact: true }).click();

  await expect(page.getByText(/1 photo uploaded/)).toBeVisible();
});
