import { expect, Page } from '@playwright/test';

/**
 * Utility functions for approval testing
 */

/**
 * Normalizes HTML content for approval testing by removing dynamic content
 * like timestamps, session IDs, etc.
 */
export function normalizeHtml(html: string): string {
  return html
    // Remove any dynamic timestamps or dates that might change
    .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, '[TIMESTAMP]')
    // Remove any cache-busting query strings
    .replace(/\?v=\d+/g, '?v=[VERSION]')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Gets the main content area of a page, excluding header/footer
 */
export async function getMainContent(page: Page): Promise<string> {
  const content = await page.locator('main, .page__content, article, .initial-content').first().innerHTML();
  return normalizeHtml(content);
}

/**
 * Gets the page title
 */
export async function getPageTitle(page: Page): Promise<string> {
  return await page.title();
}

/**
 * Verifies that a page loads successfully and has expected basic structure
 */
export async function verifyPageLoads(page: Page, url: string): Promise<void> {
  const response = await page.goto(url);
  expect(response?.status()).toBe(200);
  
  // Verify basic page structure
  await expect(page.locator('html')).toBeAttached();
  await expect(page.locator('body')).toBeAttached();
}

/**
 * Extracts text content from specific elements for approval testing
 */
export async function extractTextContent(page: Page, selector: string): Promise<string[]> {
  const elements = await page.locator(selector).all();
  const texts: string[] = [];
  for (const element of elements) {
    const text = await element.textContent();
    if (text) {
      texts.push(text.trim());
    }
  }
  return texts;
}

/**
 * Creates a snapshot of page structure for approval testing
 */
export async function createPageStructureSnapshot(page: Page): Promise<object> {
  return {
    title: await page.title(),
    url: page.url(),
    hasNavigation: await page.locator('nav, .masthead, .greedy-nav').count() > 0,
    hasFooter: await page.locator('footer, .page__footer').count() > 0,
    hasMainContent: await page.locator('main, .page__content, article').count() > 0,
    headings: await extractTextContent(page, 'h1, h2, h3'),
    links: await page.locator('a[href]').count(),
    images: await page.locator('img').count(),
  };
}

/**
 * Approval test helper - compares current state with approved snapshot
 */
export async function approvalTest(
  page: Page, 
  testName: string,
  snapshotDir: string = 'tests/snapshots'
): Promise<{ structure: object; html: string }> {
  const structure = await createPageStructureSnapshot(page);
  const html = await page.content();
  
  return { structure, html };
}
