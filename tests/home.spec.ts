import { test, expect } from '@playwright/test';
import { verifyPageLoads, createPageStructureSnapshot, extractTextContent, toNormalizedSnapshot } from './test-utils';

test.describe('Home Page', () => {
  test('should load successfully', async ({ page }) => {
    await verifyPageLoads(page, '/');
  });

  test('should have correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/DotNetDevs\.at|Welcome/i);
  });

  test('should display main content', async ({ page }) => {
    await page.goto('/');
    
    // Check for key content elements
    await expect(page.locator('body')).toContainText('DotNetDevs.at');
    await expect(page.locator('body')).toContainText('.NET');
  });

  test('should have navigation', async ({ page }) => {
    await page.goto('/');
    
    // Check for masthead or header navigation
    const header = page.locator('header, .masthead__inner-wrap, .site-nav, [role="navigation"]');
    const count = await header.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display sponsors section', async ({ page }) => {
    await page.goto('/');
    
    // Check for sponsor logos or sponsor links on home page
    const pageContent = await page.textContent('body');
    const hasSponsorContent = 
      pageContent?.includes('Sponsor') || 
      await page.locator('a[href*="/sponsors/"]').count() > 0 ||
      await page.locator('img[alt*="Rubicon"], img[alt*="JetBrains"]').count() > 0;
    expect(hasSponsorContent).toBeTruthy();
  });

  test('should have footer with social links', async ({ page }) => {
    await page.goto('/');
    
    const footer = page.locator('footer, .page__footer');
    await expect(footer.first()).toBeVisible();
  });

  test('page structure snapshot', async ({ page }) => {
    await page.goto('/');
    const structure = await createPageStructureSnapshot(page);
    
    expect(toNormalizedSnapshot(structure)).toMatchSnapshot('home-page-structure.txt');
  });

  test('visual snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('home-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});
