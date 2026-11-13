import { test, expect } from '@playwright/test';

test.describe('Authentication Journeys', () => {
  test('Login page displays cleanly with credentials form', async ({ page }) => {
    await page.goto('/login');
    await expect(page).toHaveTitle(/Clinic/i);
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /username/i })).toBeVisible();
    await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible();
  });

  test('Invalid login shows error feedback', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: /username/i }).fill('invalid_user');
    await page.getByRole('textbox', { name: /password/i }).fill('WrongPassword123!');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Verify error toast or validation feedback appears
    await expect(page.locator('.mat-mdc-snack-bar-container, .toast, [role="alert"]').first()).toBeVisible({ timeout: 5000 });
  });

  test('Admin user logs in successfully and sees administrative navigation', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: /username/i }).fill('admin');
    await page.getByRole('textbox', { name: /password/i }).fill('Admin@123456!');
    await page.getByRole('button', { name: /sign in/i }).click();

    // Verify navigation to dashboard
    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

    // Verify Admin sees User Management or Users in navigation
    await expect(page.getByRole('link', { name: /user/i }).first()).toBeVisible();

    // Verify logout returns to /login
    const logoutBtn = page.getByRole('button', { name: /logout|sign out/i });
    if (await logoutBtn.isVisible()) {
      await logoutBtn.click();
      await expect(page).toHaveURL(/.*login/, { timeout: 5000 });
    }
  });
});
