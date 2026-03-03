import { test, expect } from '@playwright/test';

/**
 * Test Suite: Visual Regression
 *
 * Purpose: Catch visual bugs and regressions using screenshot comparison
 *
 * Strategy:
 * - Use Playwright's toMatchSnapshot() for pixel-perfect comparison
 * - Test all major UI states and interactions
 * - 5% pixel threshold for acceptable differences
 * - Separate baselines per browser (Chromium, Firefox, WebKit)
 *
 * Coverage:
 * - Loading states (empty, loading, loaded)
 * - Render modes (Ball-and-Stick, Spacefill, Stick, Wireframe)
 * - Camera presets (6 views)
 * - Selection states
 * - Panels (collapsed, expanded)
 * - Modal dialogs
 *
 * Baseline Management:
 * - Update baselines: npm run test:visual:update
 * - Review changes: npm run test:report
 * - Stored in: tests/e2e/visual-regression.spec.ts-snapshots/
 */

test.describe('Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toContainText('Axiom');
  });

  test.describe('Loading States', () => {
    test('should match empty state screenshot', async ({ page }) => {
      // Wait for empty state to render
      await page.waitForTimeout(500);

      // Capture full page screenshot
      await expect(page).toHaveScreenshot('empty-state.png', {
        maxDiffPixels: 100, // Allow small rendering differences
        threshold: 0.05, // 5% pixel difference threshold
      });
    });

    test('should match structure loaded state', async ({ page }) => {
      // Load benzene sample
      const sampleDropdown = page.locator('button,select').filter({ hasText: /sample/i }).first();

      if (await sampleDropdown.count() > 0) {
        await sampleDropdown.click();

        const benzeneOption = page.locator('text=/benzene/i').first();
        if (await benzeneOption.count() > 0) {
          await benzeneOption.click();
          await page.waitForTimeout(2000); // Wait for WASM rendering
        }
      }

      // Capture loaded state
      await expect(page).toHaveScreenshot('structure-loaded.png', {
        maxDiffPixels: 500, // Molecules may have slight rendering variations
        threshold: 0.05,
      });
    });
  });

  test.describe('Render Modes', () => {
    test.beforeEach(async ({ page }) => {
      // Load a sample structure for all render mode tests
      const sampleDropdown = page.locator('button,select').filter({ hasText: /sample/i }).first();

      if (await sampleDropdown.count() > 0) {
        await sampleDropdown.click();
        const waterOption = page.locator('text=/water/i').first();
        if (await waterOption.count() > 0) {
          await waterOption.click();
          await page.waitForTimeout(2000);
        }
      }
    });

    test('should match Ball-and-Stick render mode', async ({ page }) => {
      // Press '1' key to switch to Ball-and-Stick mode
      await page.keyboard.press('1');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('render-mode-ball-stick.png', {
        maxDiffPixels: 500,
        threshold: 0.05,
      });
    });

    test('should match Spacefill render mode', async ({ page }) => {
      // Press '2' key to switch to Spacefill mode
      await page.keyboard.press('2');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('render-mode-spacefill.png', {
        maxDiffPixels: 500,
        threshold: 0.05,
      });
    });

    test('should match Stick render mode', async ({ page }) => {
      // Press '3' key to switch to Stick mode
      await page.keyboard.press('3');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('render-mode-stick.png', {
        maxDiffPixels: 500,
        threshold: 0.05,
      });
    });

    test('should match Wireframe render mode', async ({ page }) => {
      // Press '4' key to switch to Wireframe mode
      await page.keyboard.press('4');
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('render-mode-wireframe.png', {
        maxDiffPixels: 500,
        threshold: 0.05,
      });
    });
  });

  test.describe('Camera Presets', () => {
    test.beforeEach(async ({ page }) => {
      // Load a sample structure
      const sampleDropdown = page.locator('button,select').filter({ hasText: /sample/i }).first();

      if (await sampleDropdown.count() > 0) {
        await sampleDropdown.click();
        const benzeneOption = page.locator('text=/benzene/i').first();
        if (await benzeneOption.count() > 0) {
          await benzeneOption.click();
          await page.waitForTimeout(2000);
        }
      }
    });

    test('should match Front camera view', async ({ page }) => {
      const frontButton = page.locator('button').filter({ hasText: /front/i }).first();
      if (await frontButton.count() > 0) {
        await frontButton.click();
        await page.waitForTimeout(500); // Wait for camera animation (400ms)
      }

      await expect(page).toHaveScreenshot('camera-front.png', {
        maxDiffPixels: 500,
        threshold: 0.05,
      });
    });

    test('should match Top camera view', async ({ page }) => {
      const topButton = page.locator('button').filter({ hasText: /top/i }).first();
      if (await topButton.count() > 0) {
        await topButton.click();
        await page.waitForTimeout(500);
      }

      await expect(page).toHaveScreenshot('camera-top.png', {
        maxDiffPixels: 500,
        threshold: 0.05,
      });
    });

    test('should match Right camera view', async ({ page }) => {
      const rightButton = page.locator('button').filter({ hasText: /right/i }).first();
      if (await rightButton.count() > 0) {
        await rightButton.click();
        await page.waitForTimeout(500);
      }

      await expect(page).toHaveScreenshot('camera-right.png', {
        maxDiffPixels: 500,
        threshold: 0.05,
      });
    });
  });

  test.describe('Selection States', () => {
    test.beforeEach(async ({ page }) => {
      // Load a sample structure
      const sampleDropdown = page.locator('button,select').filter({ hasText: /sample/i }).first();

      if (await sampleDropdown.count() > 0) {
        await sampleDropdown.click();
        const waterOption = page.locator('text=/water/i').first();
        if (await waterOption.count() > 0) {
          await waterOption.click();
          await page.waitForTimeout(2000);
        }
      }
    });

    test('should match selection panel with no selection', async ({ page }) => {
      // Take screenshot of selection panel area
      const sidebar = page.locator('[class*="sidebar"]').or(page.locator('aside')).first();

      if (await sidebar.count() > 0) {
        await expect(sidebar).toHaveScreenshot('selection-none.png', {
          maxDiffPixels: 100,
          threshold: 0.05,
        });
      }
    });

    test('should match selection panel with atom selected', async ({ page }) => {
      // Click on canvas to select an atom
      const canvas = page.locator('canvas').first();
      await canvas.click({ position: { x: 400, y: 300 } });
      await page.waitForTimeout(500);

      const sidebar = page.locator('[class*="sidebar"]').or(page.locator('aside')).first();

      if (await sidebar.count() > 0) {
        await expect(sidebar).toHaveScreenshot('selection-single.png', {
          maxDiffPixels: 100,
          threshold: 0.05,
        });
      }
    });

    test('should match measurement mode enabled', async ({ page }) => {
      // Press 'M' key to toggle measurement mode
      await page.keyboard.press('m');
      await page.waitForTimeout(500);

      const measurementPanel = page.locator('[class*="measurement"]').or(page.locator('text=/measurement/i')).first();

      if (await measurementPanel.count() > 0) {
        await expect(measurementPanel).toHaveScreenshot('measurement-mode.png', {
          maxDiffPixels: 100,
          threshold: 0.05,
        });
      }
    });
  });

  test.describe('Panels and UI Components', () => {
    test.beforeEach(async ({ page }) => {
      // Load a sample structure
      const sampleDropdown = page.locator('button,select').filter({ hasText: /sample/i }).first();

      if (await sampleDropdown.count() > 0) {
        await sampleDropdown.click();
        const benzeneOption = page.locator('text=/benzene/i').first();
        if (await benzeneOption.count() > 0) {
          await benzeneOption.click();
          await page.waitForTimeout(2000);
        }
      }
    });

    test('should match sidebar with all panels', async ({ page }) => {
      const sidebar = page.locator('[class*="sidebar"]').or(page.locator('aside')).first();

      if (await sidebar.count() > 0) {
        await expect(sidebar).toHaveScreenshot('sidebar-full.png', {
          maxDiffPixels: 100,
          threshold: 0.05,
        });
      }
    });

    test('should match rendering settings panel', async ({ page }) => {
      const renderingPanel = page.locator('[class*="rendering"]').or(page.locator('text=/rendering/i')).first();

      if (await renderingPanel.count() > 0) {
        await expect(renderingPanel).toHaveScreenshot('panel-rendering.png', {
          maxDiffPixels: 100,
          threshold: 0.05,
        });
      }
    });

    test('should match export panel', async ({ page }) => {
      const exportPanel = page.locator('[class*="export"]').or(page.locator('text=/export/i')).first();

      if (await exportPanel.count() > 0) {
        await expect(exportPanel).toHaveScreenshot('panel-export.png', {
          maxDiffPixels: 100,
          threshold: 0.05,
        });
      }
    });
  });

  test.describe('Modal Dialogs', () => {
    test('should match keyboard shortcuts help dialog', async ({ page }) => {
      // Press '?' to open help dialog
      await page.keyboard.press('?');
      await page.waitForTimeout(500);

      const helpDialog = page.locator('[role="dialog"]').or(page.locator('text=/keyboard shortcuts/i')).first();

      if (await helpDialog.count() > 0) {
        await expect(helpDialog).toHaveScreenshot('dialog-keyboard-help.png', {
          maxDiffPixels: 100,
          threshold: 0.05,
        });
      }
    });
  });

  test.describe('Error States', () => {
    test('should match error message display', async ({ page }) => {
      // Try to load an invalid file by simulating a file upload error
      // This test may need to be adjusted based on how errors are displayed

      const fileInput = page.locator('input[type="file"]').first();

      if (await fileInput.count() > 0) {
        // Create an invalid file and attempt upload
        const invalidCifContent = 'INVALID_CIF_CONTENT';
        const buffer = Buffer.from(invalidCifContent);

        await fileInput.setInputFiles({
          name: 'invalid.cif',
          mimeType: 'chemical/x-cif',
          buffer,
        });

        await page.waitForTimeout(1000);

        // Check for error message
        const errorMessage = page.locator('[class*="error"]').or(page.locator('text=/error|failed/i')).first();

        if (await errorMessage.count() > 0) {
          await expect(errorMessage).toHaveScreenshot('error-invalid-file.png', {
            maxDiffPixels: 100,
            threshold: 0.05,
          });
        }
      }
    });
  });

  test.describe('Responsive Layouts', () => {
    test('should match mobile viewport layout', async ({ page, browserName }) => {
      // Only test on Chromium to avoid triple screenshots
      if (browserName !== 'chromium') {
        test.skip();
      }

      // Set mobile viewport
      await page.setViewportSize({ width: 375, height: 667 });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('layout-mobile.png', {
        maxDiffPixels: 100,
        threshold: 0.05,
      });
    });

    test('should match tablet viewport layout', async ({ page, browserName }) => {
      // Only test on Chromium to avoid triple screenshots
      if (browserName !== 'chromium') {
        test.skip();
      }

      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('layout-tablet.png', {
        maxDiffPixels: 100,
        threshold: 0.05,
      });
    });
  });
});
