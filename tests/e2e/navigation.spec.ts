import { test, expect } from '@playwright/test';

test.describe('IrisOS Shell Smoke Navigation', () => {
  test('logs in and visits all core modules', async ({ page }) => {
    // Go to login page
    await page.goto('/login');
    
    // Assert title
    await expect(page).toHaveTitle(/IrisOS/);
    
    // Submit login form
    await page.click('button:has-text("Sign In as Demo Executive")');
    
    // Should redirect to dashboard
    await expect(page).toHaveURL(/.*dashboard/);
    
    // Verify header
    await expect(page.locator('h1')).toContainText('Agency Command Center');
    
    // Navigation checks
    const modules = [
      { name: 'Finance', url: 'finance', header: 'Financial Ledger' },
      { name: 'Clients', url: 'clients', header: 'Client Portfolio' },
      { name: 'Projects', url: 'projects', header: 'Project Delivery' },
      { name: 'Team', url: 'team', header: 'Team & Resource Management' },
      { name: 'Reporting', url: 'reporting', header: 'Executive Reporting' },
      { name: 'Analytics', url: 'analytics', header: 'Business Intelligence' },
      { name: 'Design Hub', url: 'design-hub', header: 'Design Hub' },
      { name: 'Prism AI', url: 'prism', header: 'Prism Command Center' },
      { name: 'Automations', url: 'automations', header: 'Workflow Automations' },
      { name: 'Forecasting', url: 'forecasting', header: 'Financial & Pipeline' },
      { name: 'Operations', url: 'operations', header: 'Operational Control' },
      { name: 'Integrations', url: 'integrations', header: 'App Integrations' },
      { name: 'Settings', url: 'settings', header: 'Settings Console' },
    ];
    
    for (const mod of modules) {
      // Click nav link
      await page.click(`nav a:has-text("${mod.name}")`);
      // Assert URL
      await expect(page).toHaveURL(new RegExp(`.*${mod.url}`));
      // Assert header rendering
      await expect(page.locator('h1')).toContainText(mod.header);
    }
  });
});
