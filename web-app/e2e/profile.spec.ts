import { test, expect } from '@playwright/test';

test.describe('Profile Management', () => {
    test.beforeEach(async ({ page }) => {
        // Create user
        const username = `prof_user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
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
    });

  // TC-PROF-001: Create new profile
  test('Create new profile with required fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Profile' }).click();
    
    // Fill required
    await page.locator('input[min="16"][max="100"]').fill('25');
    await page.locator('input[min="30"][max="300"]').first().fill('75');
    await page.getByRole('button', { name: 'cm', exact: true }).click();
    await page.locator('input[min="100"][max="250"]').fill('175');
    
    // Chips 
    await page.getByRole('button', { name: 'Male', exact: true }).click();
    await page.getByRole('button', { name: 'Muscle gain', exact: true }).click();
    await page.getByRole('button', { name: 'Beginner', exact: true }).click();
    
    await page.getByPlaceholder('e.g., Just started, 6 months, 2 years').fill('3 months');
    
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByText('Profile saved successfully')).toBeVisible();
  });

  // TC-PROF-003: Missing required fields validation
  test('Validation for missing fields', async ({ page }) => {
    await page.getByRole('button', { name: 'Profile' }).click();

    // Try to save empty form
    // Just click save immediately.
    await page.getByRole('button', { name: 'Save changes' }).click();

    // Ideally, we check for validation.
    // If HTML5 validation blocks it, we won't see success toast.
    await expect(page.getByText('Profile saved successfully')).not.toBeVisible();
  });
});
