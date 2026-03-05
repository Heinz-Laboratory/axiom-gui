// Debug script to capture console errors from production site
import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch({
    args: ['--enable-unsafe-webgpu', '--enable-features=Vulkan']
  });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture ALL console messages
  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();
    console.log(`[BROWSER ${type.toUpperCase()}] ${text}`);
  });

  // Capture page errors
  page.on('pageerror', error => {
    console.error('[BROWSER ERROR]', error.message);
    console.error(error.stack);
  });

  // Navigate to production
  console.log('\n=== Navigating to https://axiom-gui.vercel.app ===\n');
  await page.goto('https://axiom-gui.vercel.app', { waitUntil: 'networkidle' });

  // Wait a bit for initialization
  await page.waitForTimeout(3000);

  // Check for error message
  const errorVisible = await page.locator('text=/renderer error/i').isVisible().catch(() => false);
  console.log(`\n=== Renderer Error Visible: ${errorVisible} ===`);

  // Take screenshot
  await page.screenshot({ path: '/home/agent/axiom-production-debug.png', fullPage: true });
  console.log('\n=== Screenshot saved to ~/axiom-production-debug.png ===');

  // Get page content
  const bodyText = await page.locator('body').textContent();
  console.log('\n=== Page Body Text ===');
  console.log(bodyText);

  await browser.close();
})();
