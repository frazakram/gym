import { test, expect } from '@playwright/test';
import { openFromProfile, registerViaApi, saveProfileViaApi } from './helpers';

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
  await openFromProfile(page, 'Body');

  await expect(page.getByText(/1 photo uploaded/)).toBeVisible();
});

test('opening the dashboard does not download body photos until the Body view is opened', async ({ page }) => {
  await registerViaApi(page, 'bodylazy');
  await saveProfileViaApi(page, { body_photos: [PHOTO] });
  const photoRequests: string[] = [];
  page.on('request', (request) => {
    if (new URL(request.url()).pathname === '/api/body/photos') photoRequests.push(request.url());
  });

  await page.goto('/dashboard', { waitUntil: 'networkidle' });
  expect(photoRequests).toHaveLength(0);

  await openFromProfile(page, 'Body');
  await expect(page.getByText(/1 photo uploaded/)).toBeVisible();
  expect(photoRequests).toHaveLength(1);
});
