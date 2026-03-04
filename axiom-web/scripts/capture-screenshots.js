/**
 * Screenshot Capture Script for Documentation
 *
 * Purpose: Generate high-quality screenshots for user documentation
 * Resolution: 1920×1080 (production quality)
 * Format: PNG (lossless)
 * Output: docs/screenshots/
 */

import { chromium } from '@playwright/test';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCREENSHOT_DIR = path.join(__dirname, '..', 'docs', 'screenshots');
const PRODUCTION_URL = 'https://heinz-laboratory.github.io/axiom-gui/';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOT_DIR)) {
  fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
}

async function captureScreenshots() {
  console.log('🚀 Starting screenshot capture...');
  console.log(`📸 Production URL: ${PRODUCTION_URL}`);
  console.log(`📁 Output: ${SCREENSHOT_DIR}\n`);

  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-unsafe-webgpu', '--no-sandbox']
  });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    deviceScaleFactor: 1
  });

  const page = await context.newPage();

  try {
    // Screenshot 1: Empty state
    console.log('📷 01 - Capturing empty state...');
    await page.goto(PRODUCTION_URL, { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000); // Let WebGPU initialize
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '01-empty-state.png'),
      fullPage: false
    });

    // Screenshot 2: Load benzene (if sample button exists)
    console.log('📷 02 - Loading benzene structure...');
    const sampleButtonSelectors = [
      'button:has-text("Load Sample")',
      'button:has-text("Sample")',
      '[aria-label*="sample"]'
    ];

    let loaded = false;
    for (const selector of sampleButtonSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          await button.click();
          await page.waitForTimeout(2000);
          loaded = true;
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    if (loaded) {
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, '02-structure-loaded.png'),
        fullPage: false
      });
    } else {
      console.log('⚠️  No sample button found, skipping structure screenshots');
    }

    // Screenshot 3: Settings panel
    console.log('📷 03 - Opening settings panel...');
    const settingsSelectors = [
      '[aria-label*="Settings"]',
      '[aria-label*="settings"]',
      'button:has-text("Settings")',
      'button[title*="Settings"]'
    ];

    for (const selector of settingsSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          await button.click();
          await page.waitForTimeout(500);
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '03-settings-panel.png'),
            fullPage: false
          });
          // Close panel
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    // Screenshot 4: Export dialog
    console.log('📷 04 - Opening export dialog...');
    const exportSelectors = [
      'button:has-text("Export")',
      '[aria-label*="Export"]',
      '[aria-label*="export"]'
    ];

    for (const selector of exportSelectors) {
      try {
        const button = page.locator(selector).first();
        if (await button.isVisible({ timeout: 2000 })) {
          await button.click();
          await page.waitForTimeout(500);
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '04-export-dialog.png'),
            fullPage: false
          });
          // Close dialog
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
          break;
        }
      } catch (e) {
        // Try next selector
      }
    }

    // Screenshot 5: Keyboard shortcuts (press ?)
    console.log('📷 05 - Opening keyboard shortcuts...');
    await page.keyboard.press('?');
    await page.waitForTimeout(500);

    // Check if shortcuts dialog opened
    const dialogSelectors = [
      '[role="dialog"]',
      '.shortcuts',
      '.keyboard-shortcuts',
      '[aria-label*="shortcuts"]'
    ];

    let shortcutsOpen = false;
    for (const selector of dialogSelectors) {
      try {
        const dialog = page.locator(selector).first();
        if (await dialog.isVisible({ timeout: 1000 })) {
          await page.screenshot({
            path: path.join(SCREENSHOT_DIR, '05-keyboard-shortcuts.png'),
            fullPage: false
          });
          shortcutsOpen = true;
          await page.keyboard.press('Escape');
          await page.waitForTimeout(300);
          break;
        }
      } catch (e) {
        // Dialog not found
      }
    }

    if (!shortcutsOpen) {
      console.log('⚠️  Keyboard shortcuts dialog not found');
    }

    // Screenshot 6: Full page overview
    console.log('📷 06 - Capturing full page overview...');
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '06-full-page-overview.png'),
      fullPage: true
    });

    // Screenshot 7: 3D canvas close-up (if structure loaded)
    if (loaded) {
      console.log('📷 07 - Canvas close-up...');
      const canvas = page.locator('canvas').first();
      if (await canvas.isVisible()) {
        await canvas.screenshot({
          path: path.join(SCREENSHOT_DIR, '07-canvas-rendering.png')
        });
      }
    }

    // Screenshot 8: Mobile responsive view
    console.log('📷 08 - Mobile responsive view...');
    await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '08-mobile-responsive.png'),
      fullPage: false
    });

    // Screenshot 9: Tablet view
    console.log('📷 09 - Tablet responsive view...');
    await page.setViewportSize({ width: 768, height: 1024 }); // iPad
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '09-tablet-responsive.png'),
      fullPage: false
    });

    // Screenshot 10: Reset to desktop for final shots
    console.log('📷 10 - Desktop final view...');
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.waitForTimeout(500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, '10-desktop-final.png'),
      fullPage: false
    });

    console.log('\n✅ Screenshot capture complete!');
    console.log(`📁 Screenshots saved to: ${SCREENSHOT_DIR}`);

    // List captured screenshots
    const files = fs.readdirSync(SCREENSHOT_DIR);
    console.log(`\n📸 Captured ${files.length} screenshots:`);
    files.forEach(file => {
      const stats = fs.statSync(path.join(SCREENSHOT_DIR, file));
      const sizeKB = (stats.size / 1024).toFixed(2);
      console.log(`   - ${file} (${sizeKB} KB)`);
    });

  } catch (error) {
    console.error('❌ Error capturing screenshots:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the capture
captureScreenshots().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
