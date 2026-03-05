import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for PRODUCTION Testing
 *
 * Tests the live Axiom GUI deployment at https://axiom-gui.vercel.app
 *
 * Usage:
 *   npx playwright test --config=playwright.config.production.ts
 *
 * Differences from dev config:
 * - baseURL points to Vercel production
 * - No local webServer (testing live site)
 * - More lenient timeouts (network latency)
 * - Retries enabled (network flakiness)
 */

export default defineConfig({
  testDir: './tests/e2e',

  // Maximum time one test can run (longer for network latency)
  timeout: 60 * 1000,

  // Expect timeout for assertions
  expect: {
    timeout: 10000, // Longer for network requests
    toHaveScreenshot: {
      maxDiffPixels: 200, // More lenient for CDN variations
      threshold: 0.1, // 10% threshold for production
      animations: 'disabled',
    },
  },

  // Run tests in parallel
  fullyParallel: true,

  // Retry strategy: Always retry on production (network issues)
  retries: 2,

  // Number of workers
  workers: 4,

  // Reporter configuration
  reporter: [['html'], ['list']],

  // Shared settings for all projects
  use: {
    // PRODUCTION URL
    baseURL: 'https://axiom-gui.vercel.app',

    // Collect trace on failure (for debugging production issues)
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Browser viewport
    viewport: { width: 1280, height: 720 },

    // Network settings for production
    navigationTimeout: 30000, // 30s for initial page load
    actionTimeout: 15000, // 15s for actions
  },

  // Test projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: {
          args: ['--enable-unsafe-webgpu'],
        },
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        launchOptions: {
          firefoxUserPrefs: {
            'dom.webgpu.enabled': true,
          },
        },
      },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // NO webServer (testing live production site)
});
