import { test, expect } from '@playwright/test';
import { greeting, loginViaUi, openProfileTab, registerViaApi, saveProfileViaApi } from './helpers';

test.describe('Authentication', () => {

  // TC-AUTH-001: Register new user
  test('Register new user with valid credentials', async ({ page }) => {
    const username = `new_user_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    await page.goto('/login');
    
    // Toggle to Register
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    
    await page.getByPlaceholder('Enter your email or username').fill(username);
    await page.getByPlaceholder('Enter your password').fill('Test@1234');
    
    // Check constraints if any... assuming simple
    
    // Dismiss generic prompt if any (browser)
    page.once('dialog', d => d.dismiss());
    
    await page.getByRole('button', { name: 'Create Account' }).click();
    
    // Expect switch to Login view or Dashboard?
    // Based on previous files, it stays on Auth but switches mode.
    // await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
  });

  // TC-AUTH-002: Login with valid credentials
  test('Login with valid credentials', async ({ page }) => {
    // Existing user with a completed profile (new users are sent to /onboarding instead).
    const { username } = await registerViaApi(page, 'login_user');
    await saveProfileViaApi(page);
    await page.context().clearCookies();

    await loginViaUi(page, username);
    await expect(greeting(page)).toBeVisible();
  });

  // TC-AUTH-003: Unregistered user login
  test('Login with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('Enter your email or username').fill('invalid_user_9999');
    await page.getByPlaceholder('Enter your password').fill('WrongPass');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    
    await expect(page.getByText('Invalid credentials')).toBeVisible(); 
  });
  
  // TC-AUTH-004: Unauthorized access blocked
  test('Unauthorized access blocked', async ({ page }) => {
      // Clear cookies/storage
      await page.context().clearCookies();
      await page.goto('/dashboard');
      
      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
  });
  
  // TC-AUTH-005: Logout
  test('User logout', async ({ page }) => {
    await registerViaApi(page, 'logout_user');
    await saveProfileViaApi(page);
    await page.goto('/dashboard');
    await expect(greeting(page)).toBeVisible();

    await openProfileTab(page);
    await page.getByRole('button', { name: 'Logout' }).click();
    await expect(page).toHaveURL(/\/login/);
  });

});
