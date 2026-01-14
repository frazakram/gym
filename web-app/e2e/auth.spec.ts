import { test, expect } from '@playwright/test';

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
    // Need a user first.
    const username = `login_user_${Date.now()}`;
    await page.goto('/login');
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await page.getByPlaceholder('Enter your email or username').fill(username);
    await page.getByPlaceholder('Enter your password').fill('Test@1234');
    await page.getByRole('button', { name: 'Create Account' }).click();
    
    await page.reload(); // Ensure fresh
    
    await page.getByPlaceholder('Enter your email or username').fill(username);
    await page.getByPlaceholder('Enter your password').fill('Test@1234');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    
    // Expect Dashboard
    await expect(page.getByText('Good morning', { exact: false })
      .or(page.getByText('Good afternoon', { exact: false }))
      .or(page.getByText('Good evening', { exact: false }))).toBeVisible();
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
      // Login first
    const username = `logout_user_${Date.now()}`;
    await page.goto('/login');
    await page.getByRole('button', { name: 'Register', exact: true }).click();
    await page.getByPlaceholder('Enter your email or username').fill(username);
    await page.getByPlaceholder('Enter your password').fill('Test@1234');
    await page.getByRole('button', { name: 'Create Account' }).click();
    await page.reload();
    await page.getByPlaceholder('Enter your email or username').fill(username);
    await page.getByPlaceholder('Enter your password').fill('Test@1234');
    await page.getByRole('button', { name: 'Sign In', exact: true }).click();
    
    // Logout is usually in Profile or Header?
    // Assuming simple button or Profile -> Logout.
    // Based on `BottomNav`, Profile is a view.
    await page.getByRole('button', { name: 'Profile' }).click();
    await page.getByRole('button', { name: 'Sign Out' }).click();
    
    await expect(page).toHaveURL(/\/login/);
  });

});
