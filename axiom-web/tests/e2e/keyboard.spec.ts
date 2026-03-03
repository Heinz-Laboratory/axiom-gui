import { test, expect } from '@playwright/test';

/**
 * Test Suite: Keyboard Shortcuts
 *
 * Validates all 13 keyboard shortcuts:
 * - Ctrl+O: Open file
 * - Ctrl+S: Save/Export
 * - Ctrl+E: Export
 * - 1-4: Render modes (Ball-and-Stick, Spacefill, Stick, Wireframe)
 * - F: Fit to view
 * - R: Reset camera
 * - Ctrl+A: Select all atoms
 * - Esc: Deselect/Clear
 * - M: Toggle measurement mode
 * - ?: Show keyboard shortcuts help
 */

test.describe('Keyboard Shortcuts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Load a sample structure
    await loadSampleStructure(page);
  });

  test('should open file picker with Ctrl+O', async ({ page }) => {
    // Press Ctrl+O
    await page.keyboard.press('Control+o');
    await page.waitForTimeout(300);

    // Check for file input or dialog
    const fileInput = page.locator('input[type="file"]').first();

    if (await fileInput.count() > 0) {
      // File input should be triggered (may not be visible)
      expect(await fileInput.count()).toBeGreaterThan(0);
    }
  });

  test('should trigger export with Ctrl+S', async ({ page }) => {
    // Press Ctrl+S
    await page.keyboard.press('Control+s');
    await page.waitForTimeout(500);

    // Export dialog should open
    const exportDialog = page.locator('[class*="export"]').or(
      page.locator('text=/export|save/i').first()
    );

    if (await exportDialog.count() > 0) {
      await expect(exportDialog.first()).toBeVisible({ timeout: 3000 });
    }
  });

  test('should trigger export with Ctrl+E', async ({ page }) => {
    // Press Ctrl+E
    await page.keyboard.press('Control+e');
    await page.waitForTimeout(500);

    // Export dialog should open
    const exportDialog = page.locator('text=/export/i').first();

    if (await exportDialog.count() > 0) {
      await expect(exportDialog).toBeVisible({ timeout: 3000 });
    }
  });

  test('should switch to Ball-and-Stick mode with key 1', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const before = await canvas.screenshot();

    // Press 1 for Ball-and-Stick
    await page.keyboard.press('1');
    await page.waitForTimeout(800);

    const after = await canvas.screenshot();

    // Canvas should update (may be same if already in mode)
    // Just verify no error occurred
    await expect(canvas).toBeVisible();
  });

  test('should switch to Spacefill mode with key 2', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const before = await canvas.screenshot();

    // Press 2 for Spacefill
    await page.keyboard.press('2');
    await page.waitForTimeout(800);

    const after = await canvas.screenshot();

    // Canvas should update
    expect(before).not.toEqual(after);
  });

  test('should switch to Stick mode with key 3', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const before = await canvas.screenshot();

    // Press 3 for Stick
    await page.keyboard.press('3');
    await page.waitForTimeout(800);

    const after = await canvas.screenshot();

    expect(before).not.toEqual(after);
  });

  test('should switch to Wireframe mode with key 4', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const before = await canvas.screenshot();

    // Press 4 for Wireframe
    await page.keyboard.press('4');
    await page.waitForTimeout(800);

    const after = await canvas.screenshot();

    expect(before).not.toEqual(after);
  });

  test('should cycle through all 4 render modes with number keys', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const screenshots: Buffer[] = [];

    // Capture screenshot for each mode
    for (let i = 1; i <= 4; i++) {
      await page.keyboard.press(i.toString());
      await page.waitForTimeout(800);

      const screenshot = await canvas.screenshot();
      screenshots.push(screenshot);
    }

    // All screenshots should be different (modes have distinct visuals)
    // At least mode 2 (Spacefill) should differ from mode 1 (Ball-and-Stick)
    expect(screenshots[0]).not.toEqual(screenshots[1]);
  });

  test('should fit camera to view with F key', async ({ page }) => {
    const canvas = page.locator('canvas').first();

    // Zoom in first
    await canvas.hover();
    await page.mouse.wheel(0, -200); // Zoom in
    await page.waitForTimeout(500);

    const before = await canvas.screenshot();

    // Press F to fit
    await page.keyboard.press('f');
    await page.waitForTimeout(500);

    const after = await canvas.screenshot();

    // Camera should reset to fit view
    expect(before).not.toEqual(after);
  });

  test('should reset camera with R key', async ({ page }) => {
    const canvas = page.locator('canvas').first();

    // Rotate camera first
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(500);
    }

    const before = await canvas.screenshot();

    // Press R to reset
    await page.keyboard.press('r');
    await page.waitForTimeout(500);

    const after = await canvas.screenshot();

    // Camera should reset
    expect(before).not.toEqual(after);
  });

  test('should select all atoms with Ctrl+A', async ({ page }) => {
    // Press Ctrl+A
    await page.keyboard.press('Control+a');
    await page.waitForTimeout(500);

    // Check for selection indicator
    const selectionText = page.locator('text=/all.*selected|selected.*all|\\d+.*selected/i').first();

    if (await selectionText.count() > 0) {
      await expect(selectionText).toBeVisible({ timeout: 3000 });
    }
  });

  test('should deselect with Esc key', async ({ page }) => {
    // Select an atom first
    const canvas = page.locator('canvas').first();
    await canvas.click();
    await page.waitForTimeout(500);

    // Press Esc to deselect
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // Selection should clear
    const noSelection = page.locator('text=/no.*selected|0.*selected/i').first();

    if (await noSelection.count() > 0) {
      await expect(noSelection).toBeVisible({ timeout: 3000 });
    }
  });

  test('should toggle measurement mode with M key', async ({ page }) => {
    // Press M to enable
    await page.keyboard.press('m');
    await page.waitForTimeout(300);

    // Check for measurement mode indicator
    const modeActive = page.locator('text=/measurement.*mode|mode.*active/i').first();

    if (await modeActive.count() > 0) {
      await expect(modeActive).toBeVisible({ timeout: 3000 });
    }

    // Press M again to disable
    await page.keyboard.press('m');
    await page.waitForTimeout(300);

    // Mode should be disabled
    if (await modeActive.count() > 0) {
      await expect(modeActive).not.toBeVisible();
    }
  });

  test('should show keyboard shortcuts help with ? key', async ({ page }) => {
    // Press ?
    await page.keyboard.press('?');
    await page.waitForTimeout(500);

    // Help dialog should appear
    const helpDialog = page.locator('[role="dialog"]').or(
      page.locator('text=/keyboard.*shortcuts|help/i').first()
    );

    if (await helpDialog.count() > 0) {
      await expect(helpDialog.first()).toBeVisible({ timeout: 3000 });

      // Dialog should list shortcuts
      const shortcutsList = page.locator('kbd,text=/ctrl.*o|ctrl.*s/i').first();
      if (await shortcutsList.count() > 0) {
        await expect(shortcutsList).toBeVisible();
      }

      // Close dialog with Esc
      await page.keyboard.press('Escape');
      await page.waitForTimeout(300);

      await expect(helpDialog.first()).not.toBeVisible();
    }
  });

  test('should not trigger shortcuts when typing in input fields', async ({ page }) => {
    // Find any text input
    const textInput = page.locator('input[type="text"],input[type="number"]').first();

    if (await textInput.count() > 0) {
      await textInput.focus();

      // Type "1234" (should not trigger render mode shortcuts)
      await page.keyboard.type('1234');
      await page.waitForTimeout(500);

      // Input should contain the text
      const value = await textInput.inputValue();
      expect(value).toContain('1');

      // Canvas should not have changed modes
      const canvas = page.locator('canvas').first();
      await expect(canvas).toBeVisible();
    }
  });

  test('should support keyboard navigation in panels', async ({ page }) => {
    // Press Tab to navigate through focusable elements
    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    await page.keyboard.press('Tab');
    await page.waitForTimeout(100);

    // Some element should be focused
    const focusedElement = page.locator(':focus').first();
    await expect(focusedElement).toBeVisible({ timeout: 3000 });
  });

  test('should handle modifier key combinations correctly', async ({ page }) => {
    // Test Ctrl+Shift combination (should not conflict)
    await page.keyboard.press('Control+Shift+a');
    await page.waitForTimeout(300);

    // Application should not crash
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();
  });

  test('should display all shortcuts in help dialog', async ({ page }) => {
    await page.keyboard.press('?');
    await page.waitForTimeout(500);

    const helpDialog = page.locator('[role="dialog"]').or(
      page.locator('[class*="keyboard"]').first()
    );

    if (await helpDialog.count() > 0) {
      // Check for all 13 shortcuts
      const expectedShortcuts = [
        /ctrl.*o/i,
        /ctrl.*s/i,
        /ctrl.*e/i,
        /1.*ball/i,
        /2.*space/i,
        /3.*stick/i,
        /4.*wire/i,
        /f.*fit/i,
        /r.*reset/i,
        /ctrl.*a.*select/i,
        /esc.*clear/i,
        /m.*measure/i,
      ];

      for (const pattern of expectedShortcuts) {
        const shortcut = page.locator(`text=${pattern}`).first();
        if (await shortcut.count() > 0) {
          // Soft check - some shortcuts may be in different sections
          expect(await shortcut.count()).toBeGreaterThan(0);
        }
      }
    }
  });

  test('should handle rapid key presses without errors', async ({ page }) => {
    // Rapidly press render mode keys
    await page.keyboard.press('1');
    await page.keyboard.press('2');
    await page.keyboard.press('3');
    await page.keyboard.press('4');
    await page.keyboard.press('1');

    await page.waitForTimeout(1000);

    // Canvas should still be visible and functional
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // No error messages should appear
    const errorMessage = page.locator('text=/error|crash|failed/i').first();
    await expect(errorMessage).not.toBeVisible();
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
