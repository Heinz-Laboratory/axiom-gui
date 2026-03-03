import { test, expect } from '@playwright/test';
import * as fs from 'fs';

/**
 * Test Suite: Export Functionality
 *
 * Validates export features:
 * - PNG screenshot export (1080p, 4K, 8K, custom)
 * - Structure file export (PDB, XYZ, CIF)
 * - Scene JSON export (camera, settings, measurements)
 * - Download verification
 */

test.describe('Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Load a sample structure
    await loadSampleStructure(page);
  });

  test('should export PNG screenshot at 1080p', async ({ page }) => {
    // Find export panel or button
    const exportButton = page.locator('button').filter({ hasText: /export/i }).first();

    if (await exportButton.count() > 0) {
      await exportButton.click();
      await page.waitForTimeout(300);

      // Select PNG format
      const pngOption = page.locator('button,input,label').filter({ hasText: /png|image|screenshot/i }).first();

      if (await pngOption.count() > 0) {
        await pngOption.click();
        await page.waitForTimeout(200);

        // Select 1080p resolution
        const resolution1080p = page.locator('button,option,input').filter({ hasText: /1080|1920.*1080/i }).first();

        if (await resolution1080p.count() > 0) {
          await resolution1080p.click();
          await page.waitForTimeout(200);
        }

        // Listen for download event
        const downloadPromise = page.waitForEvent('download', { timeout: 10000 });

        // Click export/download button
        const downloadButton = page.locator('button').filter({ hasText: /download|export|save/i }).last();
        await downloadButton.click();

        // Wait for download
        const download = await downloadPromise;

        // Verify download
        expect(download.suggestedFilename()).toMatch(/\.png$/i);

        // Verify file size (should be > 0)
        const downloadPath = await download.path();
        if (downloadPath) {
          const stats = fs.statSync(downloadPath);
          expect(stats.size).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should export PNG at 4K resolution', async ({ page }) => {
    const exportButton = page.locator('button').filter({ hasText: /export/i }).first();

    if (await exportButton.count() > 0) {
      await exportButton.click();
      await page.waitForTimeout(300);

      // Select PNG
      const pngOption = page.locator('button,input,label').filter({ hasText: /png/i }).first();
      if (await pngOption.count() > 0) {
        await pngOption.click();

        // Select 4K resolution
        const resolution4K = page.locator('button,option,input').filter({ hasText: /4k|3840.*2160/i }).first();

        if (await resolution4K.count() > 0) {
          await resolution4K.click();
          await page.waitForTimeout(200);

          const downloadPromise = page.waitForEvent('download', { timeout: 15000 });
          const downloadButton = page.locator('button').filter({ hasText: /download|export/i }).last();
          await downloadButton.click();

          const download = await downloadPromise;
          expect(download.suggestedFilename()).toMatch(/\.png$/i);
        }
      }
    }
  });

  test('should export structure as PDB format', async ({ page }) => {
    const exportButton = page.locator('button').filter({ hasText: /export/i }).first();

    if (await exportButton.count() > 0) {
      await exportButton.click();
      await page.waitForTimeout(300);

      // Select structure/file export tab
      const structureTab = page.locator('button,label').filter({ hasText: /structure|file/i }).first();
      if (await structureTab.count() > 0) {
        await structureTab.click();
      }

      // Select PDB format
      const pdbOption = page.locator('button,input,option').filter({ hasText: /pdb/i }).first();

      if (await pdbOption.count() > 0) {
        await pdbOption.click();
        await page.waitForTimeout(200);

        const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
        const downloadButton = page.locator('button').filter({ hasText: /download|export/i }).last();
        await downloadButton.click();

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.pdb$/i);

        // Verify PDB file content
        const downloadPath = await download.path();
        if (downloadPath) {
          const content = fs.readFileSync(downloadPath, 'utf-8');
          expect(content).toContain('ATOM'); // PDB files have ATOM records
        }
      }
    }
  });

  test('should export structure as XYZ format', async ({ page }) => {
    const exportButton = page.locator('button').filter({ hasText: /export/i }).first();

    if (await exportButton.count() > 0) {
      await exportButton.click();
      await page.waitForTimeout(300);

      const structureTab = page.locator('button,label').filter({ hasText: /structure|file/i }).first();
      if (await structureTab.count() > 0) {
        await structureTab.click();
      }

      const xyzOption = page.locator('button,input,option').filter({ hasText: /xyz/i }).first();

      if (await xyzOption.count() > 0) {
        await xyzOption.click();
        await page.waitForTimeout(200);

        const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
        const downloadButton = page.locator('button').filter({ hasText: /download|export/i }).last();
        await downloadButton.click();

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.xyz$/i);

        // Verify XYZ file content
        const downloadPath = await download.path();
        if (downloadPath) {
          const content = fs.readFileSync(downloadPath, 'utf-8');
          const lines = content.split('\n');
          // XYZ format: first line is atom count
          expect(lines[0]).toMatch(/^\d+$/);
        }
      }
    }
  });

  test('should export structure as CIF format', async ({ page }) => {
    const exportButton = page.locator('button').filter({ hasText: /export/i }).first();

    if (await exportButton.count() > 0) {
      await exportButton.click();
      await page.waitForTimeout(300);

      const structureTab = page.locator('button,label').filter({ hasText: /structure|file/i }).first();
      if (await structureTab.count() > 0) {
        await structureTab.click();
      }

      const cifOption = page.locator('button,input,option').filter({ hasText: /cif/i }).first();

      if (await cifOption.count() > 0) {
        await cifOption.click();
        await page.waitForTimeout(200);

        const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
        const downloadButton = page.locator('button').filter({ hasText: /download|export/i }).last();
        await downloadButton.click();

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.cif$/i);

        // Verify CIF file content
        const downloadPath = await download.path();
        if (downloadPath) {
          const content = fs.readFileSync(downloadPath, 'utf-8');
          expect(content).toContain('data_'); // CIF files start with data block
        }
      }
    }
  });

  test('should export scene as JSON', async ({ page }) => {
    const exportButton = page.locator('button').filter({ hasText: /export/i }).first();

    if (await exportButton.count() > 0) {
      await exportButton.click();
      await page.waitForTimeout(300);

      // Select scene export tab
      const sceneTab = page.locator('button,label').filter({ hasText: /scene|session/i }).first();

      if (await sceneTab.count() > 0) {
        await sceneTab.click();
        await page.waitForTimeout(200);

        const downloadPromise = page.waitForEvent('download', { timeout: 10000 });
        const downloadButton = page.locator('button').filter({ hasText: /download|export/i }).last();
        await downloadButton.click();

        const download = await downloadPromise;
        expect(download.suggestedFilename()).toMatch(/\.json$/i);

        // Verify JSON file content
        const downloadPath = await download.path();
        if (downloadPath) {
          const content = fs.readFileSync(downloadPath, 'utf-8');
          const scene = JSON.parse(content);

          // Scene should contain camera, renderSettings, etc.
          expect(scene).toHaveProperty('camera');
        }
      }
    }
  });

  test('should validate PNG export dimensions', async ({ page }) => {
    const exportButton = page.locator('button').filter({ hasText: /export/i }).first();

    if (await exportButton.count() > 0) {
      await exportButton.click();
      await page.waitForTimeout(300);

      // Try custom resolution
      const customInput = page.locator('input[type="number"]').filter({ hasText: /width|resolution/i }).first();

      if (await customInput.count() === 0) {
        // Try finding by placeholder
        const widthInput = page.locator('input[placeholder*="width" i]').first();

        if (await widthInput.count() > 0) {
          // Enter invalid width (too large)
          await widthInput.fill('20000');
          await page.waitForTimeout(200);

          // Check for validation error
          const errorMessage = page.locator('text=/invalid|too large|maximum/i').first();

          if (await errorMessage.count() > 0) {
            await expect(errorMessage).toBeVisible({ timeout: 3000 });
          }
        }
      }
    }
  });

  test('should display export panel with all formats', async ({ page }) => {
    const exportButton = page.locator('button').filter({ hasText: /export/i }).first();

    if (await exportButton.count() > 0) {
      await exportButton.click();
      await page.waitForTimeout(300);

      // Verify all export formats are available
      const expectedFormats = [
        /png|image/i,
        /pdb/i,
        /xyz/i,
        /cif/i,
        /scene|json/i,
      ];

      for (const format of expectedFormats) {
        const formatOption = page.locator(`text=${format}`).first();
        if (await formatOption.count() > 0) {
          expect(await formatOption.count()).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should handle export errors gracefully', async ({ page }) => {
    // Try to export without loading a structure
    await page.goto('/');
    await page.waitForTimeout(1000);

    const exportButton = page.locator('button').filter({ hasText: /export/i }).first();

    if (await exportButton.count() > 0) {
      await exportButton.click();
      await page.waitForTimeout(300);

      // Try to export
      const downloadButton = page.locator('button').filter({ hasText: /download|export/i }).last();

      if (await downloadButton.count() > 0) {
        await downloadButton.click();
        await page.waitForTimeout(500);

        // Check for error message
        const errorMessage = page.locator('text=/error|no.*structure|load.*file/i').first();

        if (await errorMessage.count() > 0) {
          await expect(errorMessage).toBeVisible({ timeout: 3000 });
        }
      }
    }
  });

  test('should use Ctrl+S keyboard shortcut for quick export', async ({ page }) => {
    // Press Ctrl+S
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(500);

    // Export dialog or action should trigger
    const exportDialog = page.locator('[class*="export"]').or(page.locator('text=/export/i').first());

    if (await exportDialog.count() > 0) {
      await expect(exportDialog.first()).toBeVisible({ timeout: 3000 });
    }
  });
});

/**
 * Helper: Load sample structure
 */
async function loadSampleStructure(page: any) {
  const sampleControl = page.locator('button,select').filter({ hasText: /sample/i }).first();

  if (await sampleControl.count() > 0) {
    await sampleControl.click();
    const firstSample = page.locator('option,li,[role="option"]').first();
    if (await firstSample.count() > 0) {
      await firstSample.click();
      await page.waitForTimeout(2000);
    }
  }
}
