import { test, expect, type Page } from '@playwright/test';
import { openFromProfile, openProfileTab, registerViaApi, saveProfileViaApi } from './helpers';

// Characterization of the photo upload flows (dashboard handlers). Only the AI
// analysis endpoints are stubbed; compression, saving and loading are real.

// A valid 8x8 PNG so the browser-side compression (canvas) can decode it.
const PNG_8X8 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAgAAAAICAIAAABLbSncAAAAEklEQVR4nGP4z8CAFWEXHbQSACj/P8Fu7N9hAAAAAElFTkSuQmCC',
  'base64',
);

async function stubAnalysis(page: Page, path: string, analysis: Record<string, unknown>) {
  await page.route(`**${path}`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ analysis, hasExistingPhoto: false }) }),
  );
}

async function openBodyView(page: Page) {
  await openFromProfile(page, 'Body');
}

test('body photo: upload, analysis, persists across reload, remove all', async ({ page }) => {
  await registerViaApi(page, 'bodyup');
  await saveProfileViaApi(page);
  await stubAnalysis(page, '/api/body/analyze', {
    body_type: 'athletic',
    muscle_development: 'intermediate',
    posture_notes: [],
    focus_areas: ['Back'],
    exercise_modifications: [],
    overall_assessment: 'E2E stubbed assessment',
    confidence_score: 0.9,
  });

  await page.goto('/dashboard');
  await openBodyView(page);
  await page.locator('input[type="file"]').first().setInputFiles({ name: 'front.png', mimeType: 'image/png', buffer: PNG_8X8 });
  await page.getByRole('button', { name: /Confirm & Analyze/ }).click();

  await expect(page.getByText(/1 photo uploaded/)).toBeVisible();
  await expect(page.getByText('E2E stubbed assessment').first()).toBeVisible();

  await page.reload();
  await openBodyView(page);
  await expect(page.getByText(/1 photo uploaded/)).toBeVisible();

  // The UI clears optimistically; wait for the save before checking the server.
  const removalSaved = page.waitForResponse(
    (response) => response.url().endsWith('/api/profile') && response.request().method() === 'PUT',
  );
  await page.getByRole('button', { name: /Remove all photos/ }).click();
  await expect(page.getByText(/0\/2 photos/).first()).toBeVisible();
  expect((await removalSaved).status()).toBe(200);
  const saved = await (await page.request.get('/api/body/photos')).json();
  expect(saved.body_photos).toEqual([]);
});

test('gym photo: upload with equipment analysis is saved to the profile', async ({ page }) => {
  await registerViaApi(page, 'gymup');
  await saveProfileViaApi(page);
  await stubAnalysis(page, '/api/gym/analyze', {
    equipment_detected: ['Barbell', 'Squat rack'],
    gym_type: 'commercial',
    space_assessment: 'spacious',
    unique_features: [],
    limitations: [],
    confidence_score: 0.9,
  });

  await page.goto('/dashboard');
  await openProfileTab(page);
  await page.getByText('Gym Equipment', { exact: true }).click();
  await page.locator('input[type="file"]').first().setInputFiles({ name: 'gym.png', mimeType: 'image/png', buffer: PNG_8X8 });
  await page.getByRole('button', { name: /Confirm & Analyze/ }).click();
  await expect(page.getByText(/1 photo uploaded/)).toBeVisible();

  const profile = await (await page.request.get('/api/profile')).json();
  expect(profile.profile.gym_photos).toHaveLength(1);
  expect(profile.profile.gym_equipment_analysis.equipment_detected).toEqual(['Barbell', 'Squat rack']);
});
