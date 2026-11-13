import { test, expect } from '@playwright/test';

test.describe('Receptionist Patient Workflow', () => {
  test('Receptionist logs in and navigates to patient directory', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('textbox', { name: /username/i }).fill('receptionist.clara');
    await page.getByRole('textbox', { name: /password/i }).fill('Receptionist@12!');
    await page.getByRole('button', { name: /sign in/i }).click();

    await expect(page).toHaveURL(/.*dashboard/, { timeout: 10000 });

    // Navigate to patients
    await page.goto('/patients');
    await expect(page).toHaveURL(/.*patients/);

    // Verify search bar and table or patient list exist
    await expect(page.locator('table, mat-table, [role="table"], input[type="search"], input[placeholder*="search" i]').first()).toBeVisible({ timeout: 10000 });
  });
});
