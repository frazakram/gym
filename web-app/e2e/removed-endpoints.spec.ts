import { test, expect } from '@playwright/test';

// Endpoints deliberately removed; they must not be served again.
test('POST /api/auth/google (token-in-body sign-in) is no longer served', async ({ request }) => {
  const response = await request.post('/api/auth/google', { data: { idToken: 'anything' } });
  expect(response.status()).toBe(404);
});

test('Google sign-in redirect flow is still served', async ({ request }) => {
  const response = await request.get('/api/auth/google/start', { maxRedirects: 0 });
  expect([302, 307]).toContain(response.status());
});
