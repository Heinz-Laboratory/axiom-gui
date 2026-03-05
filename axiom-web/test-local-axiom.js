import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch({
    headless: true,
    args: [
      '--use-gl=angle',
      '--use-angle=swiftshader',
      '--no-sandbox',
      '--disable-dev-shm-usage',
    ]
  });

  const context = await browser.newContext();
  const page = await context.newPage();

  const logs = [];
  page.on('console', msg => {
    const text = `${msg.type()}: ${msg.text()}`;
    logs.push(text);
    console.log('CONSOLE:', text);
  });

  page.on('pageerror', error => {
    console.log('ERROR:', error.message);
  });

  console.log('Testing local build at http://localhost:4173');
  await page.goto('http://localhost:4173', { waitUntil: 'networkidle' });
  await page.waitForTimeout(5000);

  const bodyText = await page.textContent('body');
  const hasError = bodyText.includes('Renderer Error');

  console.log('\n=== TEST RESULT ===');
  console.log(hasError ? '❌ FAILED - Renderer Error detected' : '✅ PASSED - No renderer errors');

  if (hasError) {
    console.log('\n=== Page Content ===');
    console.log(bodyText.substring(0, 500));
  }

  await page.screenshot({ path: '/home/agent/axiom-local-test.png', fullPage: true });
  console.log('\nScreenshot: /home/agent/axiom-local-test.png');

  console.log('\n=== Console Logs ===');
  logs.forEach((log, i) => console.log(`${i + 1}. ${log}`));

  await browser.close();
  process.exit(hasError ? 1 : 0);
})();
