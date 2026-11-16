import { test, expect } from '@playwright/test';

// Dark mode is switched off until every screen uses the redesign tokens
// (lib/theme.ts DARK_MODE_AVAILABLE); a phone set to dark must still get light.
test.use({ colorScheme: 'dark' });

test('the theme is set before the page renders and stays light during the redesign', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  const surface = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--gb-surface').trim());
  expect(surface.toLowerCase()).toMatch(/^#fff(fff)?$/); // the CSS minifier may shorten it
});
