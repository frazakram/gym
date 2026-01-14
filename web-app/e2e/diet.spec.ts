import { test, expect } from '@playwright/test';

test.describe('Diet Planning', () => {
  test.beforeEach(async ({ page }) => {
    // Setup: Login and Create Profile
    const username = `diet_user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    await page.goto('/login');
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await page.getByPlaceholder('Enter your email or username').fill(username);
    await page.getByPlaceholder('Enter your password').fill('Test@1234');
    page.once('dialog', d => d.dismiss());
    await page.getByRole('button', { name: 'Create Account' }).click();
    // await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
    await page.reload();
    await page.getByPlaceholder('Enter your email or username').fill(username);
    await page.getByPlaceholder('Enter your password').fill('Test@1234');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();

    // Create minimal profile
    await page.getByRole('button', { name: 'Profile' }).click();
    await page.locator('input[min="16"][max="100"]').fill('25');
    await page.locator('input[min="30"][max="300"]').first().fill('75');
    await page.getByRole('button', { name: 'cm', exact: true }).click();
    await page.locator('input[min="100"][max="250"]').fill('175');
    await page.getByRole('button', { name: 'Male', exact: true }).click();
    await page.getByRole('button', { name: 'Muscle gain', exact: true }).click();
    await page.getByRole('button', { name: 'Beginner', exact: true }).click();
    await page.getByPlaceholder('e.g., Just started, 6 months, 2 years').fill('3 months');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Profile saved successfully')).toBeVisible();
    
    // Reload to clear toasts and start fresh
    await page.reload();
    
    // Navigate to Diet tab
    await page.getByRole('button', { name: 'Diet' }).click();

    
    // Generate Plan
    const generateBtn = page.getByRole('button', { name: 'Generate Diet Plan' });
    await expect(generateBtn).toBeVisible({ timeout: 10000 });
    await generateBtn.click({ force: true });
    
    // Check loading state to confirm click (Button text change or Error modal)
    await expect(page.getByRole('button', { name: 'Generating plan...' }).or(page.getByText('Oops!'))).toBeVisible({ timeout: 10000 });

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
     await page.getByRole('button', { name: 'Diet' }).click();
     
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
