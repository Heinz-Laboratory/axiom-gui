import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 60 * 1000,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html']],
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    viewport: { width: 1440, height: 960 },
  },
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
  ],
  webServer: {
    command: 'npm run preview:prod',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: true,
    timeout: 30 * 1000,
  },
})
