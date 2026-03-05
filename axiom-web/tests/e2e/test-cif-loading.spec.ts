import { test, expect } from '@playwright/test';

test('Load CIF file on production', async ({ page }) => {
  // Listen to console messages BEFORE navigation
  const consoleLogs: string[] = [];
  const pageErrors: string[] = [];
  
  page.on('console', msg => {
    const text = msg.text();
    consoleLogs.push(text);
    console.log('BROWSER LOG:', text);
  });
  
  page.on('pageerror', err => {
    pageErrors.push(err.message);
    console.log('PAGE ERROR:', err.message);
  });
  
  // Navigate to production site
  await page.goto('https://axiom-gui.vercel.app');
  
  // Wait for page to load
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Take screenshot of initial state
  await page.screenshot({ path: '/home/agent/axiom-production-initial.png', fullPage: true });
  
  // Check for renderer error
  const hasError = await page.locator('text=/Renderer Error/i').count();
  console.log('Has renderer error?', hasError);
  
  if (hasError > 0) {
    const errorText = await page.locator('text=/Renderer Error/i').textContent();
    console.log('ERROR FOUND:', errorText);
    // Still continue to try uploading
  }
  
  // Look for file input - use .first() to handle multiple inputs
  const fileInput = page.locator('input[type="file"]').first();
  const fileInputCount = await page.locator('input[type="file"]').count();
  console.log('File input elements found:', fileInputCount);
  
  // Upload the CIF file
  console.log('Uploading CIF file...');
  await fileInput.setInputFiles('/home/agent/messages/downloads/1772692842_282239_ADONAM.PbX_perov_1.cif');
  
  // Wait for processing
  await page.waitForTimeout(5000);
  
  // Take screenshot after upload
  await page.screenshot({ path: '/home/agent/axiom-production-after-upload.png', fullPage: true });
  
  // Check for errors
  const errorAfterUpload = await page.locator('text=/Failed to load CIF file/i').count();
  console.log('Errors after upload:', errorAfterUpload);
  
  if (errorAfterUpload > 0) {
    const errorMessage = await page.locator('text=/Failed to load CIF file/i').textContent();
    console.log('Error message:', errorMessage);
  }
  
  // Check if structure info is visible
  const structureInfo = await page.locator('text=/atoms/i').count();
  console.log('Structure info visible?', structureInfo > 0);
  
  // Print all console logs
  console.log('\n=== ALL CONSOLE LOGS ===');
  consoleLogs.forEach(log => console.log(log));
  
  console.log('\n=== ALL PAGE ERRORS ===');
  pageErrors.forEach(err => console.log(err));
});
