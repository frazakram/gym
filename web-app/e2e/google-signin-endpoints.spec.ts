import { test, expect } from '@playwright/test';

// POST /api/auth/google was removed in c3c8d60 as unused, but the Android app's
// native Google sign-in calls it; it was restored. It must answer JSON (the app
// shows "couldn't connect" for anything else).
test('POST /api/auth/google (Android native sign-in) answers JSON', async ({ request }) => {
  const response = await request.post('/api/auth/google', { data: { idToken: 'not-a-google-token' } });
  expect(response.status()).toBe(401);
  expect(await response.json()).toEqual({ error: 'Authentication failed' });
});

test('Google sign-in redirect flow is still served', async ({ request }) => {
  const response = await request.get('/api/auth/google/start', { maxRedirects: 0 });
  expect([302, 307]).toContain(response.status());
});
