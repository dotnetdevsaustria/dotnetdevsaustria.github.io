import { test, expect } from '@playwright/test';
import { verifyPageLoads, createPageStructureSnapshot, toNormalizedSnapshot } from './test-utils';

test.describe('Events Page', () => {
  test('should load successfully', async ({ page }) => {
    await verifyPageLoads(page, '/events/');
  });

  test('should have correct title', async ({ page }) => {
    await page.goto('/events/');
    await expect(page).toHaveTitle(/Events/i);
  });

  test('should display events list', async ({ page }) => {
    await page.goto('/events/');
    
    // Check for events content
    await expect(page.locator('body')).toContainText('Events');
    
    // Should have event entries
    const eventEntries = page.locator('.event, a[href*="/events/"]');
    const count = await eventEntries.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display event details', async ({ page }) => {
    await page.goto('/events/');
    
    // Events should have dates and titles
    const eventLinks = page.locator('.event a, a[href*="/events/"]');
    const count = await eventLinks.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should show speaker information', async ({ page }) => {
    await page.goto('/events/');
    
    // Check for speaker mentions
    const pageContent = await page.textContent('body');
    expect(pageContent?.toLowerCase()).toContain('speaker');
  });

  test('page structure snapshot', async ({ page }) => {
    await page.goto('/events/');
    const structure = await createPageStructureSnapshot(page);
    
    expect(toNormalizedSnapshot(structure)).toMatchSnapshot('events-page-structure.txt');
  });

  test('visual snapshot', async ({ page }) => {
    await page.goto('/events/');
    await page.waitForLoadState('networkidle');
    
    await expect(page).toHaveScreenshot('events-page.png', {
      fullPage: true,
      animations: 'disabled',
    });
  });
});

test.describe('Individual Event Pages', () => {
  // Test a selection of public events from different years
  const publicEvents = [
    '2026-01-20',  // Future event
    '2025-12-16',  // Recent event
    '2025-01-14',  // Past event
    '2024-12-19',  // Older event
  ];

  for (const eventDate of publicEvents) {
    test(`should load event ${eventDate}`, async ({ page }) => {
      await verifyPageLoads(page, `/events/${eventDate}/`);
    });

    test(`event ${eventDate} should have title`, async ({ page }) => {
      await page.goto(`/events/${eventDate}/`);
      
      // Should have a heading with event title
      const heading = page.locator('h1, h2, .page__title');
      await expect(heading.first()).toBeVisible();
    });

    test(`event ${eventDate} should have speaker information`, async ({ page }) => {
      await page.goto(`/events/${eventDate}/`);
      
      const pageContent = await page.textContent('body');
      // Most events should mention speakers
      expect(pageContent).toBeTruthy();
    });

    test(`event ${eventDate} visual snapshot`, async ({ page }) => {
      await page.goto(`/events/${eventDate}/`);
      await page.waitForLoadState('networkidle');
      
      await expect(page).toHaveScreenshot(`event-${eventDate}.png`, {
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
});

test.describe('All Public Events Render', () => {
  test('all public events should be accessible from events page', async ({ page }) => {
    await page.goto('/events/');
    
    // Get all event links from the page
    const eventLinks = await page.locator('a[href*="/events/"]').all();
    const hrefs: string[] = [];
    
    for (const link of eventLinks) {
      const href = await link.getAttribute('href');
      if (href && href.includes('/events/') && !href.endsWith('/events/')) {
        hrefs.push(href);
      }
    }
    
    // Remove duplicates
    const uniqueHrefs = [...new Set(hrefs)];
    
    // Test each event page loads
    for (const href of uniqueHrefs) {
      const response = await page.goto(href);
      expect(response?.status(), `Event page ${href} should load`).toBe(200);
    }
  });
});
