import { test, expect } from '@playwright/test';
import { registerViaApi, saveProfileViaApi } from './helpers';

const theme = (page: import('@playwright/test').Page) => page.locator('html').getAttribute('data-theme');

test.describe('light and dark theme', () => {
  test.use({ colorScheme: 'dark' });

  test('follows the phone by default, and the choice is set before the page renders', async ({ page }) => {
    await page.goto('/login');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    const surface = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--gb-surface').trim().toLowerCase());
    expect(surface).toBe('#1b1e38');
  });

  test('the theme button switches and remembers; Appearance > System follows the phone again', async ({ page }) => {
    await registerViaApi(page, 'theme');
    await saveProfileViaApi(page);
    await page.goto('/dashboard', { waitUntil: 'networkidle' });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('button', { name: 'Switch to light theme' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.reload({ waitUntil: 'networkidle' });
    expect(await theme(page)).toBe('light');

    await page.getByRole('navigation').getByRole('button', { name: 'Profile', exact: true }).click();
    const appearance = page.getByRole('group', { name: 'Theme' });
    await expect(appearance.getByRole('button', { name: 'Light' })).toHaveAttribute('aria-pressed', 'true');
    await appearance.getByRole('button', { name: 'System' }).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(appearance.getByRole('button', { name: 'System' })).toHaveAttribute('aria-pressed', 'true');
  });
});
