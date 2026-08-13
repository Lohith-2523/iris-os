import { test, expect } from '@playwright/test';

test.describe('Client Login and Access Control', () => {
  test('should login successfully as a client and access client-level views', async ({ page }) => {
    // Navigate to the login page
    await page.goto('/login');
    
    // Check that we are on the login page
    await expect(page).toHaveTitle(/Iris OS/);
    
    // Fill in the client credentials we created
    await page.fill('input[type="text"]', 'client_new@client.co');
    await page.fill('input[type="password"]', 'Password123!');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Verify we see the clearance check / restricted area first
    await expect(page.locator('h2')).toContainText('Restricted Area');
    
    // Click proceed to client dashboard
    await page.click('button:has-text("Proceed to Client Dashboard")');
    
    // Should navigate to client dashboard
    await expect(page).toHaveURL(/.*client-dashboard/);
    
    // Verify client portal details
    await expect(page.locator('h1')).toContainText('Aether Technologies Marketing Command');
    
    // Check sidebar navigation item: it should only contain Client Dashboard
    await expect(page.locator('nav')).toContainText('Client Dashboard');
    await expect(page.locator('nav')).not.toContainText('Finance');
    await expect(page.locator('nav')).not.toContainText('Team');
    await expect(page.locator('nav')).not.toContainText('Atlas AI');
    await expect(page.getByRole('button', { name: 'Open Atlas AI' })).toHaveCount(0);

    // Verify client onboarding page access is not restricted anymore
    await page.goto('/clients/onboard');
    await expect(page.locator('h1')).toContainText('Client Onboarding Portal');
  });
});
