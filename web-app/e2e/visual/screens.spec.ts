import { test, expect, type Page } from '@playwright/test';
import { preparePage, seedMember, settle, signInAs } from './stable-page';

/**
 * Visual regression baseline of every key screen at phone, tablet and desktop
 * widths. Runs only in the Linux Playwright container (CI job "visual"), where
 * the baselines were generated: other platforms render fonts differently.
 * Update deliberately: Actions > CI > Run workflow > update_visual_baselines.
 */
const VIEWPORTS = [
  { name: 'phone', width: 375, height: 812 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'desktop', width: 1440, height: 900 },
] as const;

/**
 * Endless JS-driven animations: Playwright's `animations: 'disabled'` only
 * stops CSS and Web Animations, so these are held by a test-only style
 * (!important beats inline styles):
 * - landing hero: framer-motion float (inline transform);
 * - desktop login panel: typewriter that types and deletes words forever on
 *   timers; its text is hidden, its box (min-height) keeps the layout.
 */
const HOLD_JS_ANIMATIONS = [
  'div:has(> picture > img[alt="GymBro app light mode"]) { transform: none !important; }',
  'div:has(> .login-cursor) { visibility: hidden !important; }',
].join('\n');

/** `shows` is text unique to the screen: asserted before the screenshot, so a blank or wrong view fails instead of becoming a baseline. */
type Screen = { name: string; member?: 'new' | 'seeded'; open: (page: Page) => Promise<void>; shows: string };

const openDashboardTab = (tab: string) => async (page: Page) => {
  await page.goto('/dashboard');
  await settle(page);
  await page.getByRole('navigation').getByRole('button', { name: tab, exact: true }).click();
};

const openFromProfileMenu = (item: string) => async (page: Page) => {
  await openDashboardTab('Profile')(page);
  await settle(page);
  await page.getByRole('list', { name: 'More' }).getByRole('button', { name: item, exact: true }).click();
};

const openWorkoutFromToday = async (page: Page) => {
  await page.goto('/dashboard');
  await settle(page);
  await page.getByRole('button', { name: 'Start Workout' }).click();
};

const openMealPlan = async (page: Page) => {
  await openDashboardTab('Eat')(page);
  await settle(page);
  await page.getByRole('button', { name: 'Meal plan', exact: true }).click();
};

const goTo = (path: string) => async (page: Page) => {
  await page.goto(path);
};

const SCREENS: Screen[] = [
  { name: 'landing', open: goTo('/'), shows: 'The fitness app that actually knows what you eat.' },
  { name: 'login', open: goTo('/login'), shows: 'Sign In' },
  { name: 'explore', open: goTo('/explore'), shows: 'Your day, laid out.' },
  { name: 'onboarding', member: 'new', open: goTo('/onboarding'), shows: "Let's set you up" },
  { name: 'home', member: 'seeded', open: goTo('/dashboard'), shows: 'Personal Records' },
  { name: 'routine', member: 'seeded', open: openDashboardTab('Train'), shows: 'Workout' },
  { name: 'workout', member: 'seeded', open: openWorkoutFromToday, shows: 'Goblet Squat' },
  { name: 'profile', member: 'seeded', open: openDashboardTab('Profile'), shows: 'Your Progress' },
  { name: 'nutrition', member: 'seeded', open: openDashboardTab('Eat'), shows: 'Set your daily targets' },
  { name: 'diet', member: 'seeded', open: openMealPlan, shows: 'Nutrition Plan' },
  { name: 'progress', member: 'seeded', open: openFromProfileMenu('Progress'), shows: 'Active days' },
  { name: 'body', member: 'seeded', open: openFromProfileMenu('Body'), shows: 'Body Photos' },
  { name: 'coach', member: 'seeded', open: openFromProfileMenu('Coach'), shows: 'Your bookings' },
  { name: 'community', member: 'seeded', open: openFromProfileMenu('Community'), shows: 'Communities' },
];

for (const viewport of VIEWPORTS) {
  test.describe(`${viewport.name} (${viewport.width}px)`, () => {
    test.use({ viewport: { width: viewport.width, height: viewport.height } });

    for (const screen of SCREENS) {
      test(screen.name, async ({ page }) => {
        await preparePage(page);
        if (screen.member) {
          await signInAs(page, screen.member === 'new' ? 'visual_new_member' : 'visual_member');
          if (screen.member === 'seeded') await seedMember(page);
        }
        await screen.open(page);
        await settle(page);
        await expect(page.getByText(screen.shows, { exact: true }).first()).toBeVisible();
        await page.addStyleTag({ content: HOLD_JS_ANIMATIONS });
        await expect(page).toHaveScreenshot(`${screen.name}-${viewport.name}.png`, { fullPage: true });
      });
    }
  });
}
