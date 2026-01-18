import { test, expect } from '@playwright/test';
import { verifyPageLoads, createPageStructureSnapshot } from './test-utils';

/**
 * Comprehensive tests that verify ALL collection items render correctly
 * These tests dynamically discover and test all sponsors, events, and speakers
 */

test.describe('All Sponsors Render Correctly', () => {
  test('should discover and test all sponsor pages', async ({ page }) => {
    // First, go to the sponsors page to discover all sponsors
    await page.goto('/sponsors/');
    
    // Get all sponsor links
    const sponsorLinks = await page.locator('a[href*="/sponsors/"]').all();
    const hrefs: string[] = [];
    
    for (const link of sponsorLinks) {
      const href = await link.getAttribute('href');
      if (href && href.includes('/sponsors/') && !href.endsWith('/sponsors/')) {
        hrefs.push(href);
      }
    }
    
    const uniqueHrefs = [...new Set(hrefs)];
    console.log(`Found ${uniqueHrefs.length} sponsor pages to test`);
    
    expect(uniqueHrefs.length).toBeGreaterThan(0);
    
    // Test each sponsor page
    for (const href of uniqueHrefs) {
      const response = await page.goto(href);
      expect(response?.status(), `Sponsor page ${href} should return 200`).toBe(200);
      
      // Verify page has content
      const bodyText = await page.textContent('body');
      expect(bodyText?.length, `Sponsor page ${href} should have content`).toBeGreaterThan(50);
      
      // Verify there's at least one image (sponsor logo)
      const images = await page.locator('img').count();
      expect(images, `Sponsor page ${href} should have at least one image`).toBeGreaterThan(0);
    }
  });
});

test.describe('All Events Render Correctly', () => {
  test('should discover and test all public event pages', async ({ page }) => {
    // Go to the events page to discover all events
    await page.goto('/events/');
    
    // Get all event links
    const eventLinks = await page.locator('a[href*="/events/"]').all();
    const hrefs: string[] = [];
    
    for (const link of eventLinks) {
      const href = await link.getAttribute('href');
      if (href && href.includes('/events/') && !href.endsWith('/events/')) {
        hrefs.push(href);
      }
    }
    
    const uniqueHrefs = [...new Set(hrefs)];
    console.log(`Found ${uniqueHrefs.length} event pages to test`);
    
    expect(uniqueHrefs.length).toBeGreaterThan(0);
    
    // Test each event page
    for (const href of uniqueHrefs) {
      const response = await page.goto(href);
      expect(response?.status(), `Event page ${href} should return 200`).toBe(200);
      
      // Verify page has title
      const heading = page.locator('h1, h2, .page__title');
      await expect(heading.first(), `Event page ${href} should have a heading`).toBeVisible();
      
      // Verify page has content
      const bodyText = await page.textContent('body');
      expect(bodyText?.length, `Event page ${href} should have content`).toBeGreaterThan(100);
    }
  });

  test('events page should list events in chronological order', async ({ page }) => {
    await page.goto('/events/');
    
    // Get all event date texts
    const eventDates = await page.locator('.event h2, .event a h2').allTextContents();
    
    // Extract dates and verify they're in order (reversed - newest first)
    const dates: Date[] = [];
    for (const text of eventDates) {
      const match = text.match(/(\d{4}-\d{2}-\d{2})/);
      if (match) {
        dates.push(new Date(match[1]));
      }
    }
    
    // Verify dates are in descending order (newest first)
    for (let i = 1; i < dates.length; i++) {
      expect(dates[i - 1].getTime()).toBeGreaterThanOrEqual(dates[i].getTime());
    }
  });
});

test.describe('All Speakers Render Correctly', () => {
  test('should discover and test all speaker pages', async ({ page }) => {
    // Go to the speakers page to discover all speakers
    await page.goto('/speakers/');
    
    // Get all speaker links
    const speakerLinks = await page.locator('a[href*="/speakers/"]').all();
    const hrefs: string[] = [];
    
    for (const link of speakerLinks) {
      const href = await link.getAttribute('href');
      if (href && href.includes('/speakers/') && !href.endsWith('/speakers/')) {
        hrefs.push(href);
      }
    }
    
    const uniqueHrefs = [...new Set(hrefs)];
    console.log(`Found ${uniqueHrefs.length} speaker pages to test`);
    
    expect(uniqueHrefs.length).toBeGreaterThan(0);
    
    // Test each speaker page
    for (const href of uniqueHrefs) {
      const response = await page.goto(href);
      expect(response?.status(), `Speaker page ${href} should return 200`).toBe(200);
      
      // Verify page has title/heading
      const heading = page.locator('h1, h2, .page__title');
      await expect(heading.first(), `Speaker page ${href} should have a heading`).toBeVisible();
      
      // Verify page has some content
      const bodyText = await page.textContent('body');
      expect(bodyText?.length, `Speaker page ${href} should have content`).toBeGreaterThan(50);
    }
  });
});

test.describe('Cross-Page Navigation', () => {
  test('navigation links should work', async ({ page }) => {
    await page.goto('/');
    
    // Test navigation to Events
    const eventsLink = page.locator('a[href*="/events"]').first();
    if (await eventsLink.count() > 0) {
      await eventsLink.click();
      await expect(page).toHaveURL(/\/events/);
    }
    
    // Test navigation to Speakers
    await page.goto('/');
    const speakersLink = page.locator('a[href*="/speakers"]').first();
    if (await speakersLink.count() > 0) {
      await speakersLink.click();
      await expect(page).toHaveURL(/\/speakers/);
    }
    
    // Test navigation to Sponsors
    await page.goto('/');
    const sponsorsLink = page.locator('a[href*="/sponsors"]').first();
    if (await sponsorsLink.count() > 0) {
      await sponsorsLink.click();
      await expect(page).toHaveURL(/\/sponsors/);
    }
  });

  test('main pages should return 200', async ({ page }) => {
    const mainPages = ['/', '/events/', '/sponsors/', '/speakers/'];
    
    for (const pageUrl of mainPages) {
      const response = await page.goto(pageUrl);
      expect(response?.status(), `Page ${pageUrl} should return 200`).toBe(200);
    }
  });
});

test.describe('Page Content Snapshots', () => {
  test('home page content snapshot', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    const structure = await createPageStructureSnapshot(page);
    expect(JSON.stringify(structure, null, 2)).toMatchSnapshot('all-home-structure.txt');
  });

  test('events page content snapshot', async ({ page }) => {
    await page.goto('/events/');
    await page.waitForLoadState('networkidle');
    
    const structure = await createPageStructureSnapshot(page);
    expect(JSON.stringify(structure, null, 2)).toMatchSnapshot('all-events-structure.txt');
  });

  test('sponsors page content snapshot', async ({ page }) => {
    await page.goto('/sponsors/');
    await page.waitForLoadState('networkidle');
    
    const structure = await createPageStructureSnapshot(page);
    expect(JSON.stringify(structure, null, 2)).toMatchSnapshot('all-sponsors-structure.txt');
  });

  test('speakers page content snapshot', async ({ page }) => {
    await page.goto('/speakers/');
    await page.waitForLoadState('networkidle');
    
    const structure = await createPageStructureSnapshot(page);
    expect(JSON.stringify(structure, null, 2)).toMatchSnapshot('all-speakers-structure.txt');
  });
});
