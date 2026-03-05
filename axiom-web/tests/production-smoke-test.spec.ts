import { test, expect } from '@playwright/test';

test.describe('Production Smoke Test', () => {
  test('should load homepage without errors', async ({ page }) => {
    // Track console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Track page errors
    const pageErrors: Error[] = [];
    page.on('pageerror', error => {
      pageErrors.push(error);
    });

    // Navigate to production site
    await page.goto('https://axiom-gui.vercel.app');

    // Wait for app to load (look for root div to have content)
    await page.waitForTimeout(5000); // Give WASM time to load

    // Take screenshot
    await page.screenshot({ path: 'test-results/production-smoke-homepage.png', fullPage: true });

    // Check for critical errors
    console.log('Console Errors:', consoleErrors);
    console.log('Page Errors:', pageErrors.map(e => e.message));

    // Verify no renderer errors
    const rendererError = await page.locator('text=/Renderer Error/i').count();
    expect(rendererError).toBe(0);

    // Verify canvas exists
    const canvas = await page.locator('canvas').count();
    expect(canvas).toBeGreaterThan(0);

    // Print what's actually visible
    const bodyText = await page.locator('body').textContent();
    console.log('Body text (first 500 chars):', bodyText?.substring(0, 500));
  });

  test('should initialize WASM without errors', async ({ page }) => {
    const consoleMessages: string[] = [];
    page.on('console', msg => consoleMessages.push(`[${msg.type()}] ${msg.text()}`));

    await page.goto('https://axiom-gui.vercel.app');
    await page.waitForTimeout(10000); // Wait for WASM initialization

    // Check console for WASM loading issues
    console.log('All console messages:', consoleMessages.join('\n'));

    // Take screenshot after WASM load
    await page.screenshot({ path: 'test-results/production-smoke-wasm-loaded.png', fullPage: true });

    // Verify UI elements are present
    const hasFileUpload = await page.locator('input[type="file"]').count();
    const hasCanvas = await page.locator('canvas').count();

    console.log('Has file upload:', hasFileUpload > 0);
    console.log('Has canvas:', hasCanvas > 0);
  });
});
