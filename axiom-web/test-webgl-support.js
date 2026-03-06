import { chromium } from 'playwright';
import path from 'node:path';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--enable-webgl',
      '--use-gl=swiftshader',  // Software WebGL renderer
      '--enable-unsafe-swiftshader',
    ]
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture console
  page.on('console', msg => {
    console.log('BROWSER:', msg.type(), msg.text());
  });

  // Check WebGL availability
  const hasWebGL = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const vendor = debugInfo ? gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) : 'unknown';
      const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : 'unknown';
      return { supported: true, vendor, renderer };
    }
    return { supported: false };
  });

  console.log('\n=== WebGL Support ===');
  console.log(JSON.stringify(hasWebGL, null, 2));

  console.log('\n=== Testing Axiom GUI ===');
  await page.goto('https://axiom-gui.vercel.app', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  const bodyText = await page.textContent('body');
  console.log('Page status:', bodyText.includes('Renderer Error') ? '❌ ERROR' : '✅ OK');

  const screenshotPath = path.resolve('test-results/axiom-webgl-test.png');
  await page.screenshot({ path: screenshotPath, fullPage: true });
  console.log(`Screenshot saved to ${screenshotPath}`);

  await browser.close();
})();
