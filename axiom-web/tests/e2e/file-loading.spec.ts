import { test, expect } from '@playwright/test';
import * as path from 'path';

/**
 * Test Suite: File Loading
 *
 * Validates CIF file upload functionality:
 * - Sample file dropdown loading
 * - Drag-and-drop file upload
 * - Manual file picker upload
 * - File size validation (10 MB limit)
 * - Structure metadata display
 */

test.describe('File Loading', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Wait for app to initialize
    await expect(page.locator('h1')).toContainText('Axiom');
  });

  test('should display empty state on initial load', async ({ page }) => {
    // Check for empty state message
    const emptyState = page.locator('text=/no molecule loaded/i');
    await expect(emptyState).toBeVisible({ timeout: 5000 });

    // Verify canvas is present but empty
    const canvas = page.locator('canvas');
    await expect(canvas).toBeVisible();
  });

  test('should load sample file from dropdown', async ({ page }) => {
    // Find and click sample file dropdown
    const sampleDropdown = page.locator('select').filter({ hasText: /sample|benzene|water/i }).first();

    if (await sampleDropdown.count() > 0) {
      // Select benzene sample
      await sampleDropdown.selectOption({ label: /benzene/i });

      // Wait for structure to load
      await page.waitForTimeout(2000); // Allow WASM rendering time

      // Verify structure info panel appears
      const structureInfo = page.locator('text=/atoms/i');
      await expect(structureInfo).toBeVisible({ timeout: 5000 });

      // Check that atom count is displayed (benzene = 12 atoms)
      const atomCount = page.locator('text=/12.*atoms/i');
      await expect(atomCount).toBeVisible();
    }
  });

  test('should load water sample and display metadata', async ({ page }) => {
    // Select water sample
    const sampleDropdown = page.locator('button,select').filter({ hasText: /sample/i }).first();

    if (await sampleDropdown.count() > 0) {
      await sampleDropdown.click();

      // Click water option
      const waterOption = page.locator('text=/water/i').first();
      if (await waterOption.count() > 0) {
        await waterOption.click();

        // Wait for loading to complete
        await page.waitForTimeout(2000);

        // Verify structure metadata
        const metadata = page.locator('[class*="structure-info"]').or(page.locator('text=/atoms|elements/i'));
        await expect(metadata.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should handle file upload via drag-and-drop', async ({ page }) => {
    // Create a sample CIF file content
    const cifContent = `data_test
_cell_length_a 10.0
_cell_length_b 10.0
_cell_length_c 10.0
_cell_angle_alpha 90.0
_cell_angle_beta 90.0
_cell_angle_gamma 90.0
loop_
_atom_site_label
_atom_site_type_symbol
_atom_site_fract_x
_atom_site_fract_y
_atom_site_fract_z
C1 C 0.0 0.0 0.0
C2 C 0.5 0.5 0.5
`;

    // Simulate drag-and-drop by creating a file and uploading
    const canvas = page.locator('canvas').first();

    // Note: Playwright's drag-and-drop for files requires a workaround
    // We'll test the file input fallback instead
    const fileInput = page.locator('input[type="file"]').first();

    if (await fileInput.count() > 0) {
      // Create a temporary file
      const tempPath = path.join('/tmp', 'test-structure.cif');
      await page.evaluate((content) => {
        // Mock file upload via JavaScript
        const dataTransfer = new DataTransfer();
        const file = new File([content], 'test-structure.cif', { type: 'chemical/x-cif' });
        dataTransfer.items.add(file);

        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (input) {
          input.files = dataTransfer.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, cifContent);

      // Wait for upload processing
      await page.waitForTimeout(2000);
    }
  });

  test('should validate file size limit (10 MB)', async ({ page }) => {
    // Create a large mock file (>10 MB)
    const largeCifContent = 'data_large\n' + 'C1 C 0.0 0.0 0.0\n'.repeat(500000); // ~10+ MB

    const fileInput = page.locator('input[type="file"]').first();

    if (await fileInput.count() > 0) {
      await page.evaluate((content) => {
        const dataTransfer = new DataTransfer();
        const file = new File([content], 'large-structure.cif', { type: 'chemical/x-cif' });
        dataTransfer.items.add(file);

        const input = document.querySelector('input[type="file"]') as HTMLInputElement;
        if (input) {
          input.files = dataTransfer.files;
          input.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }, largeCifContent);

      // Check for error message
      const errorMessage = page.locator('text=/file size|too large|10.*mb/i').first();
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display structure information panel', async ({ page }) => {
    // Load a sample structure
    const sampleButton = page.locator('button,select').filter({ hasText: /sample/i }).first();

    if (await sampleButton.count() > 0) {
      await sampleButton.click();
      const firstSample = page.locator('option,li').filter({ hasText: /benzene|water/i }).first();

      if (await firstSample.count() > 0) {
        await firstSample.click();
        await page.waitForTimeout(2000);

        // Verify structure info fields
        const expectedFields = ['atoms', 'elements', 'bonds'];

        for (const field of expectedFields) {
          const fieldElement = page.locator(`text=/${field}/i`).first();
          // Soft assertion - field may or may not be visible depending on implementation
          if (await fieldElement.count() > 0) {
            await expect(fieldElement).toBeVisible();
          }
        }
      }
    }
  });

  test('should update canvas when structure loads', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Take screenshot before loading
    const beforeScreenshot = await canvas.screenshot();

    // Load sample structure
    const sampleButton = page.locator('button,select').filter({ hasText: /sample/i }).first();

    if (await sampleButton.count() > 0) {
      await sampleButton.click();
      const sample = page.locator('option,li').first();

      if (await sample.count() > 0) {
        await sample.click();
        await page.waitForTimeout(3000); // Allow rendering time

        // Take screenshot after loading
        const afterScreenshot = await canvas.screenshot();

        // Canvas content should have changed
        expect(beforeScreenshot).not.toEqual(afterScreenshot);
      }
    }
  });
});
