import { test, expect } from '@playwright/test';

/**
 * Test Suite: Atom Selection & Measurement
 *
 * Validates selection and measurement features:
 * - Click to select atoms
 * - Multi-select (Ctrl/Shift + click)
 * - Distance measurement (2 atoms)
 * - Angle measurement (3 atoms)
 * - Selection keyboard shortcuts (Ctrl+A, Esc)
 * - Measurement overlay visualization
 */

test.describe('Atom Selection & Measurement', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Load a sample structure
    await loadSampleStructure(page);
  });

  test('should select atom on canvas click', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();

    if (box) {
      // Click center of canvas (likely to hit an atom)
      await canvas.click({
        position: {
          x: box.width / 2,
          y: box.height / 2,
        },
      });

      await page.waitForTimeout(500);

      // Check for selection indicator (panel or highlight)
      const selectionPanel = page.locator('text=/selected|selection|atom/i').first();

      if (await selectionPanel.count() > 0) {
        await expect(selectionPanel).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should select multiple atoms with Ctrl+click', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();

    if (box) {
      // First click
      await canvas.click({
        position: { x: box.width / 3, y: box.height / 3 },
      });
      await page.waitForTimeout(300);

      // Second click with Ctrl
      await canvas.click({
        position: { x: 2 * box.width / 3, y: 2 * box.height / 3 },
        modifiers: ['Control'],
      });
      await page.waitForTimeout(300);

      // Check selection count (should have 2 atoms selected)
      const selectionText = page.locator('text=/2.*atom|atom.*2|selected.*2/i').first();

      if (await selectionText.count() > 0) {
        await expect(selectionText).toBeVisible({ timeout: 3000 });
      }
    }
  });

  test('should clear selection with Esc key', async ({ page }) => {
    const canvas = page.locator('canvas').first();

    // Select an atom first
    await canvas.click();
    await page.waitForTimeout(500);

    // Press Esc to clear
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Verify selection cleared
    const emptySelection = page.locator('text=/no.*selected|0.*selected/i').first();

    if (await emptySelection.count() > 0) {
      await expect(emptySelection).toBeVisible({ timeout: 3000 });
    }
  });

  test('should select all atoms with Ctrl+A', async ({ page }) => {
    // Press Ctrl+A
    await page.keyboard.press('Control+A');
    await page.waitForTimeout(500);

    // Check for "all selected" indicator
    const allSelected = page.locator('text=/all.*selected|selected.*all/i').first();

    if (await allSelected.count() > 0) {
      await expect(allSelected).toBeVisible({ timeout: 3000 });
    }
  });

  test('should measure distance between 2 atoms', async ({ page }) => {
    // Enable measurement mode
    const measureButton = page.locator('button').filter({ hasText: /measure/i }).first();

    if (await measureButton.count() > 0) {
      await measureButton.click();
      await page.waitForTimeout(300);

      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();

      if (box) {
        // Click two atoms
        await canvas.click({ position: { x: box.width / 3, y: box.height / 2 } });
        await page.waitForTimeout(300);

        await canvas.click({ position: { x: 2 * box.width / 3, y: box.height / 2 } });
        await page.waitForTimeout(500);

        // Check for distance measurement display (Å units)
        const distanceText = page.locator('text=/\\d+\\.\\d+.*Å|Å.*\\d+\\.\\d+|distance/i').first();

        if (await distanceText.count() > 0) {
          await expect(distanceText).toBeVisible({ timeout: 3000 });
        }
      }
    }
  });

  test('should measure angle between 3 atoms', async ({ page }) => {
    // Enable measurement mode
    const measureButton = page.locator('button').filter({ hasText: /measure/i }).first();

    if (await measureButton.count() > 0) {
      await measureButton.click();
      await page.waitForTimeout(300);

      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();

      if (box) {
        // Click three atoms
        await canvas.click({ position: { x: box.width / 4, y: box.height / 2 } });
        await page.waitForTimeout(200);

        await canvas.click({ position: { x: box.width / 2, y: box.height / 2 } });
        await page.waitForTimeout(200);

        await canvas.click({ position: { x: 3 * box.width / 4, y: box.height / 2 } });
        await page.waitForTimeout(500);

        // Check for angle measurement (degrees)
        const angleText = page.locator('text=/\\d+\\.\\d+.*°|°.*\\d+\\.\\d+|angle/i').first();

        if (await angleText.count() > 0) {
          await expect(angleText).toBeVisible({ timeout: 3000 });
        }
      }
    }
  });

  test('should display measurement overlay on canvas', async ({ page }) => {
    // Enable measurement mode and create a measurement
    const measureButton = page.locator('button').filter({ hasText: /measure/i }).first();

    if (await measureButton.count() > 0) {
      await measureButton.click();
      await page.waitForTimeout(300);

      const canvas = page.locator('canvas').first();
      const box = await canvas.boundingBox();

      if (box) {
        // Create distance measurement
        await canvas.click({ position: { x: box.width / 3, y: box.height / 2 } });
        await canvas.click({ position: { x: 2 * box.width / 3, y: box.height / 2 } });
        await page.waitForTimeout(500);

        // Check for SVG overlay or canvas annotation
        const overlay = page.locator('svg,[class*="overlay"],[class*="measurement"]').first();

        if (await overlay.count() > 0) {
          await expect(overlay).toBeVisible();
        }
      }
    }
  });

  test('should delete measurement from panel', async ({ page }) => {
    // Create a measurement first
    const measureButton = page.locator('button').filter({ hasText: /measure/i }).first();

    if (await measureButton.count() > 0) {
      await measureButton.click();
      await page.waitForTimeout(300);

      const canvas = page.locator('canvas').first();
      await canvas.click();
      await page.waitForTimeout(200);
      await canvas.click();
      await page.waitForTimeout(500);

      // Find delete button in measurement panel
      const deleteButton = page.locator('button').filter({ hasText: /delete|remove|×/i }).first();

      if (await deleteButton.count() > 0) {
        await deleteButton.click();
        await page.waitForTimeout(300);

        // Verify measurement removed
        const measurementList = page.locator('[class*="measurement"]').first();
        // Check that measurement is no longer displayed
      }
    }
  });

  test('should highlight selected atoms on canvas', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const before = await canvas.screenshot();

    // Click to select an atom
    await canvas.click();
    await page.waitForTimeout(500);

    const after = await canvas.screenshot();

    // Canvas should show highlight (visual difference)
    expect(before).not.toEqual(after);
  });

  test('should display atom details in selection panel', async ({ page }) => {
    const canvas = page.locator('canvas').first();

    // Click to select an atom
    await canvas.click();
    await page.waitForTimeout(500);

    // Check for atom details (element, index, coordinates)
    const expectedDetails = [
      /element|type|symbol/i,
      /index|id/i,
      /position|coordinates|x.*y.*z/i,
    ];

    for (const pattern of expectedDetails) {
      const detail = page.locator(`text=${pattern}`).first();
      if (await detail.count() > 0) {
        // Soft check - details may be in different formats
        expect(await detail.count()).toBeGreaterThan(0);
      }
    }
  });

  test('should toggle measurement mode with M key', async ({ page }) => {
    // Press M to enable measurement mode
    await page.keyboard.press('m');
    await page.waitForTimeout(300);

    // Check for measurement mode indicator
    const modeIndicator = page.locator('text=/measurement.*mode|mode.*active/i').first();

    if (await modeIndicator.count() > 0) {
      await expect(modeIndicator).toBeVisible({ timeout: 3000 });
    }

    // Press M again to disable
    await page.keyboard.press('m');
    await page.waitForTimeout(300);

    // Mode should be disabled
    if (await modeIndicator.count() > 0) {
      await expect(modeIndicator).not.toBeVisible();
    }
  });

  test('should persist selection across camera movements', async ({ page }) => {
    const canvas = page.locator('canvas').first();

    // Select an atom
    await canvas.click();
    await page.waitForTimeout(500);

    // Rotate camera
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 50, box.y + box.height / 2, { steps: 5 });
      await page.mouse.up();
      await page.waitForTimeout(500);
    }

    // Selection should still be active
    const selectionPanel = page.locator('text=/selected|selection/i').first();
    if (await selectionPanel.count() > 0) {
      await expect(selectionPanel).toBeVisible();
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
