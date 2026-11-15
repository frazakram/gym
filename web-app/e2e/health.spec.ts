import { test, expect } from '@playwright/test';

// Uptime monitors call this anonymously; nothing in front of the route may
// redirect it to the login page or cache it.
test('GET /api/health is public, uncached JSON', async ({ request }) => {
  const response = await request.get('/api/health', { maxRedirects: 0 });
  expect(response.status()).toBe(200);
  expect(response.headers()['cache-control']).toContain('no-store');
  expect(await response.json()).toMatchObject({ status: 'ok', checks: { database: 'ok' } });
});
