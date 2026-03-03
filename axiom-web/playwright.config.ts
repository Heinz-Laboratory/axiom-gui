import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for Axiom Web E2E Tests
 *
 * Testing Strategy:
 * - 3 browsers: Chromium (WebGPU stable), Firefox (WebGPU beta), WebKit (Safari preview)
 * - Headless mode for CI/CD
 * - Local dev server at http://localhost:5173
 * - Screenshots/videos on test failure
 * - Retries: 2 on CI, 0 locally (for faster iteration)
 */

export default defineConfig({
  testDir: './tests/e2e',

  // Maximum time one test can run
  timeout: 30 * 1000,

  // Expect timeout for assertions
  expect: {
    timeout: 5000,
    // Visual regression snapshot configuration
    toHaveScreenshot: {
      maxDiffPixels: 100, // Default max pixel difference
      threshold: 0.05, // Default 5% threshold
      animations: 'disabled', // Disable animations for consistent screenshots
    },
  },

  // Run tests in parallel across workers
  fullyParallel: true,

  // Fail the build on CI if tests have focus
  forbidOnly: !!process.env.CI,

  // Retry strategy: 2 retries on CI (flaky tests), 0 locally (fast feedback)
  retries: process.env.CI ? 2 : 0,

  // Number of workers: use all CPU cores on CI, limit to 4 locally
  workers: process.env.CI ? '100%' : 4,

  // Reporter configuration
  reporter: process.env.CI
    ? [['html'], ['github']]
    : [['html'], ['list']],

  // Shared settings for all projects
  use: {
    // Base URL for all tests
    baseURL: 'http://localhost:5173',

    // Collect trace on first retry (for debugging flaky tests)
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Video on failure
    video: 'retain-on-failure',

    // Browser viewport
    viewport: { width: 1280, height: 720 },
  },

  // Test projects for different browsers
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        // WebGPU is stable in Chrome 113+
        launchOptions: {
          args: ['--enable-unsafe-webgpu'], // Enable WebGPU in headless mode
        },
      },
    },

    {
      name: 'firefox',
      use: {
        ...devices['Desktop Firefox'],
        // WebGPU in Firefox is in beta (requires about:config flag)
        launchOptions: {
          firefoxUserPrefs: {
            'dom.webgpu.enabled': true, // Enable WebGPU in Firefox
          },
        },
      },
    },

    {
      name: 'webkit',
      use: {
        ...devices['Desktop Safari'],
        // Safari 18+ has WebGPU support (macOS Sonoma+)
        // Note: WebKit in Playwright may not fully support WebGPU yet
      },
    },

    // Mobile testing (viewport size only, WebGPU may not be available)
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  // Run local dev server before starting tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000, // 2 minutes for dev server startup
  },
});
