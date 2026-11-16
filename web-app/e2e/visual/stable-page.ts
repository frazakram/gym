import { expect, type Page } from '@playwright/test';
import { DEFAULT_PROFILE, PASSWORD } from '../helpers';

/**
 * Makes a page render identically on every run, so screenshots only change
 * when the UI changes:
 * - The page's Date starts at 09:00 IST on today's date and then runs
 *   normally (greetings, weekday; the server uses the real date, so dates
 *   agree). Playwright's clock API is not used: it also stops the
 *   high-resolution timer framer-motion animates with, and the dashboard
 *   only mounts the next view after the previous one's exit animation.
 * - Math.random is seeded (quote shuffle and picks).
 * - The cookie banner is already answered (playwright.config storageState).
 */
export async function preparePage(page: Page): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const startMs = new Date(`${today}T09:00:00+05:30`).getTime();
  await page.addInitScript((fixedStartMs: number) => {
    const RealDate = Date;
    const pageStart = performance.now();
    const now = () => fixedStartMs + (performance.now() - pageStart);
    class StableDate extends RealDate {
      constructor(...args: unknown[]) {
        if (args.length === 0) super(now());
        else super(...(args as [string | number | Date]));
      }
      static now() {
        return now();
      }
    }
    (globalThis as { Date: DateConstructor }).Date = StableDate as unknown as DateConstructor;

    let seed = 20261116;
    Math.random = () => {
      seed = (seed * 1664525 + 1013904223) % 4294967296;
      return seed / 4294967296;
    };
  }, startMs);
}

/** Time for entrance and view-switch animations to finish (longest is 0.8 s + 0.35 s delay). */
const ANIMATIONS_SETTLE_MS = 1_500;

/**
 * Waits for data and animations. Scrolls through the page first so sections
 * that animate in when scrolled into view are visible in full-page shots.
 */
export async function settle(page: Page): Promise<void> {
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    const step = window.innerHeight / 2;
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(ANIMATIONS_SETTLE_MS);
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
