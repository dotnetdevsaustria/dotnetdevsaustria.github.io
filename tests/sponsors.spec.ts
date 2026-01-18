import { test, expect } from '@playwright/test';
import { verifyPageLoads, createPageStructureSnapshot, extractTextContent } from './test-utils';

test.describe('Sponsors Page', () => {
  test('should load successfully', async ({ page }) => {
    await verifyPageLoads(page, '/sponsors/');
  });

  test('should have correct title', async ({ page }) => {
    await page.goto('/sponsors/');
    await expect(page).toHaveTitle(/Sponsors/i);
  });

  test('should display sponsors list', async ({ page }) => {
    await page.goto('/sponsors/');
    
    // Check for sponsor content
    await expect(page.locator('body')).toContainText('Sponsors');
    
    // Should have at least one sponsor
    const sponsorLinks = page.locator('.sponsor, .sponsor-link, a[href*="/sponsors/"]');
    const count = await sponsorLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display sponsor logos', async ({ page }) => {
    await page.goto('/sponsors/');
    
    // Check for sponsor images
    const sponsorImages = page.locator('img[alt], .sponsor-image');
    const count = await sponsorImages.count();
    expect(count).toBeGreaterThan(0);
  });

  test('page structure snapshot', async ({ page }) => {
    await page.goto('/sponsors/');
    const structure = await createPageStructureSnapshot(page);
    
    expect(JSON.stringify(structure, null, 2)).toMatchSnapshot('sponsors-page-structure.txt');
  });

  test('visual snapshot', async ({ page }) => {
    await page.goto('/sponsors/');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('sponsors-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Individual Sponsor Pages', () => {
  const sponsors = ['rubicon', 'jetbrains'];

  for (const sponsor of sponsors) {
    test(`should load ${sponsor} sponsor page`, async ({ page }) => {
      await verifyPageLoads(page, `/sponsors/${sponsor}/`);
    });

    test(`${sponsor} page should have sponsor name`, async ({ page }) => {
      await page.goto(`/sponsors/${sponsor}/`);
      
      // Title or heading should contain sponsor name
      const pageContent = await page.textContent('body');
      expect(pageContent?.toLowerCase()).toContain(sponsor.toLowerCase());
    });

    test(`${sponsor} page should have sponsor logo`, async ({ page }) => {
      await page.goto(`/sponsors/${sponsor}/`);
      
      const logo = page.locator('img');
      await expect(logo.first()).toBeVisible();
    });

    test(`${sponsor} page visual snapshot`, async ({ page }) => {
      await page.goto(`/sponsors/${sponsor}/`);
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot(`sponsor-${sponsor}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
});
