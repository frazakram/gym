import { expect, type Page } from '@playwright/test';

export const PASSWORD = 'Test@1234';

export function uniqueUsername(prefix = 'e2e'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 1e6)}`;
}

/** Reads the csrf_token cookie the API set on this browser context. */
export async function csrfHeader(page: Page): Promise<Record<string, string>> {
  const cookie = (await page.context().cookies()).find((c) => c.name === 'csrf_token');
  return cookie ? { 'x-csrf-token': cookie.value } : {};
}

/**
 * Registers through the real API. page.request shares the browser context's
 * cookie jar, so the page is logged in afterwards.
 */
export async function registerViaApi(page: Page, prefix?: string): Promise<{ username: string; userId: number }> {
  const username = uniqueUsername(prefix);
  const res = await page.request.post('/api/auth/register', { data: { username, password: PASSWORD } });
  expect(res.status(), await res.text()).toBe(201);
  const body = await res.json();
  return { username, userId: body.userId };
}

export const DEFAULT_PROFILE = {
  name: 'E2E Tester',
  age: 25,
  weight: 75,
  height: 175,
  gender: 'Male',
  goal: 'Muscle gain',
  level: 'Beginner',
  tenure: '3 months',
  cuisine: null,
  cooking_level: null,
  budget: null,
};

export async function saveProfileViaApi(page: Page, overrides: Record<string, unknown> = {}): Promise<void> {
  const res = await page.request.put('/api/profile', {
    data: { ...DEFAULT_PROFILE, ...overrides },
    headers: await csrfHeader(page),
  });
  expect(res.status(), await res.text()).toBe(200);
}

/** A 7-day routine with exercises every day, so "today" is always a training day. */
export function sevenDayRoutine() {
  const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return {
    days: names.map((day) => ({
      day: `${day} - Full Body`,
      exercises: [
        { name: 'Goblet Squat', sets_reps: '3 sets x 10 reps (rest 90s)', youtube_urls: [] },
        { name: 'Push-up', sets_reps: '3 sets x 12 reps (rest 60s)', youtube_urls: [] },
      ],
    })),
  };
}

/** A 7-day routine of rest days only (every day shows the rest-day controls). */
export function restWeekRoutine() {
  const names = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  return { days: names.map((day) => ({ day: `${day} - Rest Day`, exercises: [] })) };
}

export async function saveRoutineViaApi(page: Page, routine = sevenDayRoutine()): Promise<number> {
  const res = await page.request.post('/api/routines', {
    data: { weekNumber: 1, routine },
    headers: await csrfHeader(page),
  });
  expect(res.status(), await res.text()).toBe(200);
  return (await res.json()).routineId;
}

/** Logs in through the login form (the user must already exist). */
export async function loginViaUi(page: Page, username: string): Promise<void> {
  await page.goto('/login');
  await page.getByPlaceholder('Enter your email or username').fill(username);
  await page.getByPlaceholder('Enter your password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
}

export function greeting(page: Page) {
  return page
    .getByText('Good morning', { exact: false })
    .or(page.getByText('Good afternoon', { exact: false }))
    .or(page.getByText('Good evening', { exact: false }));
}

/** Opens the Profile tab from the bottom navigation. */
export async function openProfileTab(page: Page): Promise<void> {
  await openTab(page, 'Profile');
}

/** Opens a bottom-navigation tab: Today, Train, Eat or Profile. */
export async function openTab(page: Page, tab: 'Today' | 'Train' | 'Eat' | 'Profile'): Promise<void> {
  await page.getByRole('navigation').getByRole('button', { name: tab, exact: true }).click();
}

/** Opens a screen listed on Profile (Progress, Body, Coach, Community, Find gym nearby). */
export async function openFromProfile(page: Page, item: 'Progress' | 'Body' | 'Coach' | 'Community' | 'Find gym nearby'): Promise<void> {
  await openTab(page, 'Profile');
  await page.getByRole('list', { name: 'More' }).getByRole('button', { name: item, exact: true }).click();
}

/** Books the default coach through the real API (user must have premium/trial access). */
export async function bookDefaultCoachViaApi(page: Page): Promise<number> {
  const res = await page.request.post('/api/coach/book', {
    data: { userName: 'E2E Tester', userEmail: 'e2e@example.com', userPhone: '+919800000000', message: 'E2E booking' },
    headers: await csrfHeader(page),
  });
  expect(res.status(), await res.text()).toBe(200);
  return (await res.json()).bookingId;
}

/**
 * The error toast (role=alert). Next.js also renders a role=alert route
 * announcer, so match the toast element itself.
 */
export function errorToast(page: Page) {
  return page.locator('.toast-a[role="alert"]');
}
