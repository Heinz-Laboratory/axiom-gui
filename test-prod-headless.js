import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({
    args: ['--disable-web-security', '--enable-unsafe-webgpu']
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Track all console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    if (type === 'error' || type === 'warning') {
      console.log(`[${type.toUpperCase()}] ${text}`);
    }
  });

  // Track page errors
  page.on('pageerror', error => {
    console.log(`[PAGE ERROR] ${error.message}`);
  });

  // Track network failures
  page.on('requestfailed', request => {
    console.log(`[NETWORK FAIL] ${request.url()} - ${request.failure()?.errorText}`);
  });

  console.log('🔍 Loading https://axiom-gui.vercel.app...\n');

  await page.goto('https://axiom-gui.vercel.app', { waitUntil: 'networkidle' });

  console.log('\n⏱️  Waiting 5 seconds for WASM to initialize...\n');
  await page.waitForTimeout(5000);

  // Check what's actually on the page
  const bodyText = await page.locator('body').textContent();
  console.log('📄 Page content (first 500 chars):', bodyText?.substring(0, 500));

  // Check for error messages
  const hasRendererError = await page.locator('text=/Renderer Error/i').count();
  const hasCanvas = await page.locator('canvas').count();
  const hasFileInput = await page.locator('input[type="file"]').count();

  console.log('\n✅ Page state:');
  console.log(`  - Renderer Error visible: ${hasRendererError > 0 ? '❌ YES' : '✅ NO'}`);
  console.log(`  - Canvas present: ${hasCanvas > 0 ? '✅ YES' : '❌ NO'}`);
  console.log(`  - File input present: ${hasFileInput > 0 ? '✅ YES' : '❌ NO'}`);

  // Take screenshot
  await page.screenshot({ path: 'production-screenshot.png', fullPage: true });
  console.log('\n📸 Screenshot saved to production-screenshot.png');

  await browser.close();
  console.log('\n✅ Test complete');
})();
