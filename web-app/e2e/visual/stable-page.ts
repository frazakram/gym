import { expect, type Page } from '@playwright/test';
import { DEFAULT_PROFILE, PASSWORD } from '../helpers';

/**
 * Makes a page render identically on every run, so screenshots only change
 * when the UI changes:
 * - the browser clock is fixed at 09:00 IST on today's date (the server uses
 *   the real date, so dates agree) and only advances when the test says so;
 * - Math.random is seeded (quote shuffle and picks);
 * - the cookie banner is already answered (playwright.config storageState).
 */
export async function preparePage(page: Page): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const nineAmIst = new Date(`${today}T09:00:00+05:30`);
  await page.clock.install({ time: nineAmIst });
  await page.clock.pauseAt(new Date(nineAmIst.getTime() + 1_000));
  await page.addInitScript(() => {
    let seed = 20261116;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
  });
}

/**
 * Waits for data, then advances the frozen clock by a fixed amount so
 * entrance animations finish and looping ones stop at the same frame.
 */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.clock.runFor(3_000);
  await page.waitForLoadState('networkidle');
  await page.evaluate(() => document.fonts.ready);
}

/** Fixed visual-test users: registered on first use, logged in afterwards (retries, reruns). */
export async function signInAs(page: Page, username: string): Promise<void> {
  const registered = await page.request.post('/api/auth/register', { data: { username, password: PASSWORD } });
  if (registered.status() !== 201) {
    const login = await page.request.post('/api/auth/login', { data: { username, password: PASSWORD } });
    expect(login.status(), await login.text()).toBe(200);
  }
}

async function csrfHeader(page: Page): Promise<Record<string, string>> {
  await page.request.get('/api/csrf');
  const cookie = (await page.context().cookies()).find((c) => c.name === 'csrf_token');
  return cookie ? { 'x-csrf-token': cookie.value } : {};
}

/**
 * A complete profile and a routine whose seven days are identical, so the
 * screens look the same whichever weekday the test runs on.
 */
export async function seedMember(page: Page): Promise<void> {
  const headers = await csrfHeader(page);
  const profile = await page.request.put('/api/profile', { data: { ...DEFAULT_PROFILE, name: 'Asha Verma' }, headers });
  expect(profile.status(), await profile.text()).toBe(200);
  const routines = await page.request.get('/api/routines?all=true');
  const existing = (await routines.json().catch(() => null)) as { routines?: unknown[] } | null;
  if (existing?.routines?.length) return;
  const day = {
    day: 'Full Body',
    exercises: [
      { name: 'Goblet Squat', sets_reps: '3 sets x 10 reps (rest 90s)', youtube_urls: [] },
      { name: 'Push-up', sets_reps: '3 sets x 12 reps (rest 60s)', youtube_urls: [] },
      { name: 'Dumbbell Row', sets_reps: '3 sets x 10 reps (rest 60s)', youtube_urls: [] },
    ],
  };
  const saved = await page.request.post('/api/routines', {
    data: { weekNumber: 1, routine: { days: Array.from({ length: 7 }, () => day) } },
    headers,
  });
  expect(saved.status(), await saved.text()).toBe(200);
}
