import { test, expect } from '@playwright/test';

test('Debug production site', async ({ page }, testInfo) => {
  // Capture console messages
  const consoleMessages: string[] = [];
  page.on('console', msg => {
    const text = `[${msg.type().toUpperCase()}] ${msg.text()}`;
    consoleMessages.push(text);
    console.log(text);
  });

  // Capture page errors
  page.on('pageerror', error => {
    const text = `[PAGE ERROR] ${error.message}\n${error.stack}`;
    consoleMessages.push(text);
    console.error(text);
  });

  console.log('\n=== Navigating to https://axiom-gui.vercel.app ===\n');

  await page.goto('https://axiom-gui.vercel.app', { waitUntil: 'networkidle' });

  // Wait for app to initialize
  await page.waitForTimeout(5000);

  // Take screenshot
  await page.screenshot({
    path: testInfo.outputPath('axiom-production-debug.png'),
    fullPage: true,
  });
  console.log('\n=== Screenshot saved ===');

  // Check for error message
  const errorText = await page.locator('.error-message, [class*="error"]').allTextContents();
  console.log('\n=== Error Messages Found ===');
  console.log(errorText);

  // Get body text
  const bodyText = await page.locator('body').textContent();
  console.log('\n=== Page Body ===');
  console.log(bodyText);

  console.log('\n=== All Console Messages ===');
  console.log(consoleMessages.join('\n'));
});
