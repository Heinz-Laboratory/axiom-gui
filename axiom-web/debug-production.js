import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleLogs = [];
  const networkLogs = [];
  const errors = [];

  // Capture console messages BEFORE navigation
  page.on('console', msg => {
    const text = `${msg.type()}: ${msg.text()}`;
    consoleLogs.push(text);
    console.log('BROWSER:', text);
  });

  // Capture page errors
  page.on('pageerror', error => {
    errors.push(error.message);
    console.log('PAGE ERROR:', error.message);
  });

  // Capture network failures
  page.on('requestfailed', request => {
    const fail = `${request.url()} - ${request.failure().errorText}`;
    networkLogs.push(`FAILED: ${fail}`);
    console.log('NETWORK FAILED:', fail);
  });

  // Capture all network requests
  page.on('response', response => {
    const url = response.url();
    if (url.includes('.wasm') || url.includes('.js')) {
      const log = `${response.status()} ${url}`;
      networkLogs.push(log);
      console.log('NETWORK:', log);
    }
  });

  console.log('Navigating to production site...');
  await page.goto('https://axiom-gui.vercel.app', { waitUntil: 'networkidle' });

  // Wait for any async initialization
  await page.waitForTimeout(5000);

  // Check for error messages in the DOM
  const bodyText = await page.textContent('body').catch(() => 'Could not read body');
  console.log('\n=== PAGE CONTENT ===');
  console.log(bodyText.substring(0, 500));

  // Take screenshot
  await page.screenshot({ path: '/home/agent/axiom-production-debug.png', fullPage: true });
  console.log('\n=== Screenshot saved ===');

  // Summary
  console.log('\n=== SUMMARY ===');
  console.log(`Console logs: ${consoleLogs.length}`);
  console.log(`Network logs: ${networkLogs.length}`);
  console.log(`Errors: ${errors.length}`);

  if (consoleLogs.length > 0) {
    console.log('\n=== ALL CONSOLE LOGS ===');
    consoleLogs.forEach((log, i) => console.log(`${i + 1}. ${log}`));
  }

  if (errors.length > 0) {
    console.log('\n=== ALL ERRORS ===');
    errors.forEach((err, i) => console.log(`${i + 1}. ${err}`));
  }

  await browser.close();
})();
