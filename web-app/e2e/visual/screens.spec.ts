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

type Screen = { name: string; member?: 'new' | 'seeded'; open: (page: Page) => Promise<void> };

const openDashboardTab = (tab: string) => async (page: Page) => {
  await page.goto('/dashboard');
  await settle(page);
  await page.getByRole('navigation').getByRole('button', { name: tab, exact: true }).click();
};

const openDashboardMenuItem = (item: string) => async (page: Page) => {
  await page.goto('/dashboard');
  await settle(page);
  await page.getByRole('navigation').getByRole('button', { name: 'Open menu' }).click();
  await settle(page);
  await page.getByRole('button', { name: item, exact: true }).first().click();
};

const SCREENS: Screen[] = [
  { name: 'landing', open: (page) => page.goto('/').then(() => undefined) },
  { name: 'login', open: (page) => page.goto('/login').then(() => undefined) },
  { name: 'explore', open: (page) => page.goto('/explore').then(() => undefined) },
  { name: 'onboarding', member: 'new', open: (page) => page.goto('/onboarding').then(() => undefined) },
  { name: 'home', member: 'seeded', open: (page) => page.goto('/dashboard').then(() => undefined) },
  { name: 'routine', member: 'seeded', open: openDashboardTab('Routine') },
  { name: 'workout', member: 'seeded', open: openDashboardTab('Workout') },
  { name: 'profile', member: 'seeded', open: openDashboardTab('Profile') },
  { name: 'nutrition', member: 'seeded', open: openDashboardMenuItem('Nutrition') },
  { name: 'diet', member: 'seeded', open: openDashboardMenuItem('Diet') },
  { name: 'body', member: 'seeded', open: openDashboardMenuItem('Body') },
  { name: 'coach', member: 'seeded', open: openDashboardMenuItem('Coach') },
  { name: 'community', member: 'seeded', open: openDashboardMenuItem('Community') },
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
        await expect(page).toHaveScreenshot(`${screen.name}-${viewport.name}.png`, { fullPage: true });
      });
    }
  });
}
