import { test, expect } from '@playwright/test';

// Landing page image weight (Phase 4): the hero screenshot was a 1.5 MB PNG and a
// second 1.3 MB PNG that is never visible (dark-mode only; the app is light-only)
// was downloaded anyway. Mobile LCP measured 13-14 s.
test('landing page loads only the visible hero image, as WebP, within the image budget', async ({ page }) => {
  const imageBytes = new Map<string, number>();
  page.on('response', async (response) => {
    if (response.request().resourceType() !== 'image') return;
    const body = await response.body().catch(() => Buffer.alloc(0));
    imageBytes.set(new URL(response.url()).pathname, body.length);
  });

  await page.goto('/', { waitUntil: 'networkidle' });

  const hero = page.getByRole('img', { name: 'GymBro app light mode' });
  await expect(hero).toBeVisible();
  expect(await hero.evaluate((img: HTMLImageElement) => img.currentSrc)).toMatch(/\/app-light\.webp$/);

  expect([...imageBytes.keys()]).not.toContain('/app-dark.png');
  expect([...imageBytes.keys()]).not.toContain('/app-light.png');
  const totalImageKb = [...imageBytes.values()].reduce((sum, bytes) => sum + bytes, 0) / 1024;
  expect(totalImageKb).toBeLessThan(400);
});
