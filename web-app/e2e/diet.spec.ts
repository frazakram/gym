import { test, expect } from '@playwright/test';
import { openTab, registerViaApi, saveProfileViaApi, errorToast } from './helpers';

test.describe('Diet Planning', () => {
  // These specs make real AI calls; they only run when a key is provided.
  test.skip(!process.env.OPENAI_API_KEY, 'Needs OPENAI_API_KEY (real AI call)');

  test.beforeEach(async ({ page }) => {
    // Setup: user + profile through the real API (UI sign-up now goes via /onboarding;
    // that flow is covered in journeys.spec.ts), then open the dashboard.
    await registerViaApi(page);
    await saveProfileViaApi(page);
    await page.goto('/dashboard');
    
    // Reload to clear toasts and start fresh
    await page.reload();
    
    // Navigate to Diet tab
    await openTab(page, 'Eat');
    await page.getByRole('button', { name: 'Meal plan', exact: true }).click();

    
    // Generate Plan
    const generateBtn = page.getByRole('button', { name: 'Generate Diet Plan' });
    await expect(generateBtn).toBeVisible({ timeout: 10000 });
    await generateBtn.click({ force: true });
    
    // Check loading state to confirm click (Button text change or Error modal)
    await expect(page.getByRole('button', { name: 'Generating plan...' }).or(errorToast(page))).toBeVisible({ timeout: 10000 });

    // Wait for generation (120s)
    await expect(page.getByText('Generating plan...')).not.toBeVisible({ timeout: 120000 });

    // Verify Plan Display
    // Header often has "Nutrition"
    await expect(page.getByText('Nutrition')).toBeVisible();
    
    // Check for days
    await expect(page.getByText('Monday')).toBeVisible();
    
    // Check for regenerate button availability
    await expect(page.getByRole('button', { name: 'Regenerate' })).toBeVisible();
  });

  // TC-DIET-016: Regenerate diet plan
  test('Regenerate diet plan', async ({ page }) => {
     if (!process.env.OPENAI_API_KEY) {
         test.skip(true, 'Skipping OpenAI test because OPENAI_API_KEY is not set');
         return;
     }

     // Use reload to ensure clean state
     await page.reload();
     await openTab(page, 'Eat');
    await page.getByRole('button', { name: 'Meal plan', exact: true }).click();
     
     // Assuming empty state
     if (await page.getByText('No Diet Plan Yet').isVisible()) {
         await page.getByRole('button', { name: 'Generate Diet Plan' }).click();
         await expect(page.getByText(/Generating/i)).not.toBeVisible({ timeout: 120000 });
     }
     
     // Now Click Regenerate
     await page.getByRole('button', { name: 'Regenerate' }).click();
     await expect(page.getByText(/Refreshing/i)).toBeVisible();
     await expect(page.getByText(/Refreshing/i)).not.toBeVisible({ timeout: 120000 });
     
     // Verify new plan still loaded
     await expect(page.getByText('Monday')).toBeVisible();
  });
});
