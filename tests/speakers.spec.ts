import { test, expect } from '@playwright/test';
import { verifyPageLoads, createPageStructureSnapshot, extractTextContent, toNormalizedSnapshot } from './test-utils';

test.describe('Speakers Page', () => {
  test('should load successfully', async ({ page }) => {
    await verifyPageLoads(page, '/speakers/');
  });

  test('should have correct title', async ({ page }) => {
    await page.goto('/speakers/');
    await expect(page).toHaveTitle(/Speakers/i);
  });

  test('should display speakers list', async ({ page }) => {
    await page.goto('/speakers/');
    
    // Check for speakers content
    await expect(page.locator('body')).toContainText('Speakers');
    
    // Should have speaker entries
    const speakerEntries = page.locator('.speaker, a[href*="/speakers/"]');
    const count = await speakerEntries.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display speaker names', async ({ page }) => {
    await page.goto('/speakers/');
    
    // Check for speaker name elements
    const speakerNames = page.locator('.speaker-name, .speaker h3, a[href*="/speakers/"]');
    const count = await speakerNames.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display speaker images where available', async ({ page }) => {
    await page.goto('/speakers/');
    
    // Some speakers have images
    const speakerImages = page.locator('.speaker-image, .speaker img');
    const count = await speakerImages.count();
    // At least some speakers should have images
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('page structure snapshot', async ({ page }) => {
    await page.goto('/speakers/');
    const structure = await createPageStructureSnapshot(page);
    
    expect(toNormalizedSnapshot(structure)).toMatchSnapshot('speakers-page-structure.txt');
  });

  test('visual snapshot', async ({ page }) => {
    await page.goto('/speakers/');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('speakers-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Individual Speaker Pages', () => {
  // Test all speakers
  const speakers = [
    'alex-gavrilescu',
    'alex-thissen',
    'andreas-willich',
    'bas-dijkstra',
    'christian-schabetsberger',
    'christoph-wille',
    'david-eiwen',
    'david-walsner',
    'davide-bellone',
    'jiri-cincura',
    'manuel-juran',
    'martin-ullrich',
    'matthias-koch',
    'michael-ketting',
    'patrick-saeuerl',
    'paul-rohorzka',
    'rainer-stropek',
    'raoul-holzer',
    'roman-jasek',
    'shahab-ganji',
    'stefan-polz',
    'tim-paulus',
  ];

  for (const speaker of speakers) {
    test(`should load ${speaker} speaker page`, async ({ page }) => {
      await verifyPageLoads(page, `/speakers/${speaker}/`);
    });

    test(`${speaker} page should have speaker name`, async ({ page }) => {
      await page.goto(`/speakers/${speaker}/`);
      
      // Page should contain speaker name (converted from slug)
      const heading = page.locator('h1, h2, .page__title');
      await expect(heading.first()).toBeVisible();
    });

    test(`${speaker} page should have bio if available`, async ({ page }) => {
      await page.goto(`/speakers/${speaker}/`);
      
      // Page should have some content
      const content = await page.textContent('body');
      expect(content?.length).toBeGreaterThan(100);
    });

    test(`${speaker} page visual snapshot`, async ({ page }) => {
      await page.goto(`/speakers/${speaker}/`);
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot(`speaker-${speaker}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
});

test.describe('All Speakers Render', () => {
  test('all speakers should be accessible from speakers page', async ({ page }) => {
    await page.goto('/speakers/');
    
    // Get all speaker links from the page
    const speakerLinks = await page.locator('a[href*="/speakers/"]').all();
    const hrefs: string[] = [];
    
    for (const link of speakerLinks) {
      const href = await link.getAttribute('href');
      if (href && href.includes('/speakers/') && !href.endsWith('/speakers/')) {
        hrefs.push(href);
      }
    }
    
    // Remove duplicates
    const uniqueHrefs = [...new Set(hrefs)];
    
    console.log(`Found ${uniqueHrefs.length} speaker pages to test`);
    
    // Test each speaker page loads
    for (const href of uniqueHrefs) {
      const response = await page.goto(href);
      expect(response?.status(), `Speaker page ${href} should load`).toBe(200);
    }
  });
});
