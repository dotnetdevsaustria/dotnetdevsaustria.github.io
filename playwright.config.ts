import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for DotNetDevs.at website testing
 * Uses approval testing with visual snapshots
 */
export default defineConfig({
  testDir: './tests',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Opt out of parallel tests on CI */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use */
  reporter: [
    ['html'],
    ['list']
  ],
  /* Shared settings for all the projects below */
  use: {
    /* Base URL to use in actions like `await page.goto('/')` */
    baseURL: process.env.BASE_URL || 'http://127.0.0.1:4000',
    /* Collect trace when retrying the failed test */
    trace: 'on-first-retry',
    /* Screenshot on failure */
    screenshot: 'only-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        // Standardize viewport for consistent screenshots
        viewport: { width: 1280, height: 720 },
      },
    },
  ],

  /* Run your local dev server before starting the tests */
  webServer: {
    command: 'bundle exec jekyll serve --no-watch',
    url: 'http://127.0.0.1:4000',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // Jekyll build can take time
  },

  /* Snapshot settings for approval testing */
  snapshotPathTemplate: '{testDir}/{testFileDir}/{testFileName}-snapshots/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      // Allow up to 2% pixel difference for cross-machine font rendering variations
      maxDiffPixelRatio: 0.02,
      // Threshold for color difference (0-1, higher = more tolerant)
      threshold: 0.3,
    },
    toMatchSnapshot: {
      maxDiffPixelRatio: 0.1,
    },
  },

  /* Output folder for test artifacts */
  outputDir: 'test-results/',
});
