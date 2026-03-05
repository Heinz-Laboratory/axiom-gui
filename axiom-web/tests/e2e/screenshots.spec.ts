/**
 * Screenshot Capture Script for Documentation
 *
 * Purpose: Generate high-quality screenshots for user documentation
 * Resolution: 1920×1080 (production quality)
 * Format: PNG (lossless)
 * Output: docs/screenshots/
 *
 * Usage: npx playwright test screenshots.spec.ts --project=chromium
 */

import { test, expect } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure for documentation screenshots
test.use({
  viewport: { width: 1920, height: 1080 },
  screenshot: 'on', // Always capture screenshots
  baseURL: undefined, // Don't use local dev server - use production URL directly
});

const SCREENSHOT_DIR = path.join(__dirname, '..', '..', 'docs', 'screenshots');
const PRODUCTION_URL = 'https://axiom-gui.vercel.app/';

test.describe('Documentation Screenshots', () => {

  test('01 - Empty state (initial load)', async ({ page }) => {
    await page.goto(PRODUCTION_URL);

    // Wait for app to initialize
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(1000); // Let WebGPU initialize

    // Capture empty state
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/01-empty-state.png`,
      fullPage: false
    });
  });

  test('02 - File loaded (benzene structure)', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    // Try to load sample file
    // Check if there's a sample file button or if we need to upload
    const sampleButton = page.locator('button:has-text("Load Sample")');
    if (await sampleButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sampleButton.click();
      await page.waitForTimeout(2000); // Wait for structure to render
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/02-file-loaded-benzene.png`,
      fullPage: false
    });
  });

  test('03 - Rendering settings panel', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    // Look for settings button/icon
    const settingsButton = page.locator('[aria-label*="Settings"], [aria-label*="settings"], button:has-text("Settings")').first();
    if (await settingsButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await settingsButton.click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/03-settings-panel.png`,
        fullPage: false
      });
    }
  });

  test('04 - Ball and stick rendering mode', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    // Load sample if available
    const sampleButton = page.locator('button:has-text("Load Sample")');
    if (await sampleButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sampleButton.click();
      await page.waitForTimeout(1500);
    }

    // Try to switch to ball-and-stick mode
    const ballStickButton = page.locator('button:has-text("Ball"), [value="ball-and-stick"]').first();
    if (await ballStickButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await ballStickButton.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/04-rendering-ball-and-stick.png`,
      fullPage: false
    });
  });

  test('05 - Space filling rendering mode', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    const sampleButton = page.locator('button:has-text("Load Sample")');
    if (await sampleButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sampleButton.click();
      await page.waitForTimeout(1500);
    }

    // Try space-filling mode
    const spaceFillingButton = page.locator('button:has-text("Space"), [value="space-filling"]').first();
    if (await spaceFillingButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await spaceFillingButton.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/05-rendering-space-filling.png`,
      fullPage: false
    });
  });

  test('06 - Wireframe rendering mode', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    const sampleButton = page.locator('button:has-text("Load Sample")');
    if (await sampleButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sampleButton.click();
      await page.waitForTimeout(1500);
    }

    // Try wireframe mode
    const wireframeButton = page.locator('button:has-text("Wireframe"), [value="wireframe"]').first();
    if (await wireframeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await wireframeButton.click();
      await page.waitForTimeout(1000);
    }

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/06-rendering-wireframe.png`,
      fullPage: false
    });
  });

  test('07 - Camera controls panel', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    // Look for camera/view controls
    const cameraButton = page.locator('[aria-label*="Camera"], [aria-label*="camera"], button:has-text("Camera")').first();
    if (await cameraButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await cameraButton.click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/07-camera-controls.png`,
        fullPage: false
      });
    }
  });

  test('08 - Export dialog', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    // Load sample first
    const sampleButton = page.locator('button:has-text("Load Sample")');
    if (await sampleButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sampleButton.click();
      await page.waitForTimeout(1500);
    }

    // Look for export button
    const exportButton = page.locator('button:has-text("Export"), [aria-label*="Export"]').first();
    if (await exportButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await exportButton.click();
      await page.waitForTimeout(500);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/08-export-dialog.png`,
        fullPage: false
      });
    }
  });

  test('09 - Keyboard shortcuts panel', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    // Try pressing '?' or looking for help button
    await page.keyboard.press('?');
    await page.waitForTimeout(500);

    // Check if shortcuts panel opened
    const shortcutsPanel = page.locator('[role="dialog"], .shortcuts, .keyboard-shortcuts');
    if (await shortcutsPanel.isVisible({ timeout: 1000 }).catch(() => false)) {
      await page.screenshot({
        path: `${SCREENSHOT_DIR}/09-keyboard-shortcuts.png`,
        fullPage: false
      });
    }
  });

  test('10 - Atom selection UI', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    const sampleButton = page.locator('button:has-text("Load Sample")');
    if (await sampleButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sampleButton.click();
      await page.waitForTimeout(1500);
    }

    // Try to click on canvas to select atom
    const canvas = page.locator('canvas').first();
    if (await canvas.isVisible()) {
      await canvas.click({ position: { x: 960, y: 540 } }); // Center of 1920x1080
      await page.waitForTimeout(500);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/10-atom-selection.png`,
        fullPage: false
      });
    }
  });

  test('11 - Crystal structure (quartz)', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    // Try to load quartz sample if there's a way to select specific samples
    const sampleButton = page.locator('button:has-text("Load Sample"), button:has-text("Quartz")');
    if (await sampleButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sampleButton.click();
      await page.waitForTimeout(2000);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/11-structure-quartz.png`,
        fullPage: false
      });
    }
  });

  test('12 - Full UI overview', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    const sampleButton = page.locator('button:has-text("Load Sample")');
    if (await sampleButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await sampleButton.click();
      await page.waitForTimeout(1500);
    }

    // Capture full UI with structure loaded
    await page.screenshot({
      path: `${SCREENSHOT_DIR}/12-full-ui-overview.png`,
      fullPage: true
    });
  });

  test('13 - Responsive layout (desktop)', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    await page.screenshot({
      path: `${SCREENSHOT_DIR}/13-responsive-desktop.png`,
      fullPage: false
    });
  });

  test('14 - Water molecule structure', async ({ page }) => {
    await page.goto(PRODUCTION_URL);
    await page.waitForLoadState('networkidle');

    // Water is simpler, good for documentation
    const waterButton = page.locator('button:has-text("Water"), button:has-text("water")');
    if (await waterButton.isVisible({ timeout: 2000 }).catch(() => false)) {
      await waterButton.click();
      await page.waitForTimeout(1500);

      await page.screenshot({
        path: `${SCREENSHOT_DIR}/14-structure-water.png`,
        fullPage: false
      });
    }
  });

});
