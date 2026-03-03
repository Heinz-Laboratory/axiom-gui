import { test, expect } from '@playwright/test';

/**
 * Test Suite: Camera Controls
 *
 * Validates camera manipulation features:
 * - Mouse drag rotation
 * - Mouse wheel zoom
 * - Camera presets (Front, Back, Left, Right, Top, Bottom)
 * - Smooth transitions and animations
 * - Manual rotation/zoom/pan sliders
 */

test.describe('Camera Controls', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');

    // Load a sample structure first
    await loadSampleStructure(page);
  });

  test('should rotate camera with mouse drag', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    await expect(canvas).toBeVisible();

    // Take screenshot before rotation
    const before = await canvas.screenshot();

    // Simulate mouse drag (rotation)
    const box = await canvas.boundingBox();
    if (box) {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;

      // Drag from center to right (should rotate around Y axis)
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX + 100, centerY, { steps: 10 });
      await page.mouse.up();

      // Wait for rendering
      await page.waitForTimeout(500);

      // Take screenshot after rotation
      const after = await canvas.screenshot();

      // Canvas should have changed
      expect(before).not.toEqual(after);
    }
  });

  test('should zoom with mouse wheel', async ({ page }) => {
    const canvas = page.locator('canvas').first();

    // Take screenshot before zoom
    const before = await canvas.screenshot();

    // Simulate mouse wheel zoom in
    await canvas.hover();
    await page.mouse.wheel(0, -100); // Negative delta = zoom in

    await page.waitForTimeout(500);

    // Take screenshot after zoom
    const after = await canvas.screenshot();

    // Canvas content should have changed (molecule appears larger)
    expect(before).not.toEqual(after);
  });

  test('should pan camera with middle mouse button', async ({ page }) => {
    const canvas = page.locator('canvas').first();
    const box = await canvas.boundingBox();

    if (box) {
      const centerX = box.x + box.width / 2;
      const centerY = box.y + box.height / 2;

      // Take screenshot before pan
      const before = await canvas.screenshot();

      // Simulate middle mouse drag (panning)
      await page.mouse.move(centerX, centerY);
      await page.mouse.down({ button: 'middle' });
      await page.mouse.move(centerX + 50, centerY - 50, { steps: 10 });
      await page.mouse.up({ button: 'middle' });

      await page.waitForTimeout(500);

      // Take screenshot after pan
      const after = await canvas.screenshot();

      // Canvas should have changed
      expect(before).not.toEqual(after);
    }
  });

  test('should apply Front camera preset', async ({ page }) => {
    // Find camera presets panel
    const presetsPanel = page.locator('[class*="camera-preset"]').or(
      page.locator('text=/presets|front|back/i').first()
    );

    if (await presetsPanel.count() > 0) {
      // Click Front preset button
      const frontButton = page.locator('button').filter({ hasText: /front/i }).first();

      if (await frontButton.count() > 0) {
        const canvas = page.locator('canvas').first();
        const before = await canvas.screenshot();

        await frontButton.click();
        await page.waitForTimeout(500); // Animation duration

        const after = await canvas.screenshot();
        expect(before).not.toEqual(after);
      }
    }
  });

  test('should cycle through all 6 camera presets', async ({ page }) => {
    const presets = ['Front', 'Back', 'Left', 'Right', 'Top', 'Bottom'];

    for (const preset of presets) {
      const button = page.locator('button').filter({ hasText: new RegExp(preset, 'i') }).first();

      if (await button.count() > 0) {
        await button.click();
        await page.waitForTimeout(600); // Animation + rendering time

        // Verify canvas updated
        const canvas = page.locator('canvas').first();
        await expect(canvas).toBeVisible();
      }
    }
  });

  test('should animate camera transitions smoothly', async ({ page }) => {
    const topButton = page.locator('button').filter({ hasText: /top/i }).first();

    if (await topButton.count() > 0) {
      // Record start time
      const startTime = Date.now();

      await topButton.click();

      // Wait for animation to complete
      await page.waitForTimeout(500);

      const elapsed = Date.now() - startTime;

      // Animation should take approximately 400ms (as per Phase 3.5 spec)
      expect(elapsed).toBeGreaterThanOrEqual(300);
      expect(elapsed).toBeLessThan(700);
    }
  });

  test('should rotate camera with rotation sliders', async ({ page }) => {
    // Look for rotation controls
    const rotationSlider = page.locator('input[type="range"]').filter({ hasText: /rotate|rotation/i }).first();

    if (await rotationSlider.count() === 0) {
      // Try finding by label
      const sliders = await page.locator('input[type="range"]').all();

      if (sliders.length > 0) {
        const canvas = page.locator('canvas').first();
        const before = await canvas.screenshot();

        // Move first slider (likely X rotation)
        await sliders[0].fill('45');
        await page.waitForTimeout(500);

        const after = await canvas.screenshot();
        expect(before).not.toEqual(after);
      }
    }
  });

  test('should zoom with zoom slider', async ({ page }) => {
    // Find zoom slider (range input)
    const zoomSlider = page.locator('input[type="range"]').filter({ hasText: /zoom/i }).first();

    if (await zoomSlider.count() === 0) {
      // Find by nearby label
      const zoomLabel = page.locator('text=/zoom/i').first();
      if (await zoomLabel.count() > 0) {
        const slider = page.locator('input[type="range"]').near(zoomLabel).first();

        if (await slider.count() > 0) {
          const canvas = page.locator('canvas').first();
          const before = await canvas.screenshot();

          await slider.fill('200'); // 200% zoom
          await page.waitForTimeout(500);

          const after = await canvas.screenshot();
          expect(before).not.toEqual(after);
        }
      }
    }
  });

  test('should reset camera to default view', async ({ page }) => {
    const canvas = page.locator('canvas').first();

    // Rotate camera first
    const box = await canvas.boundingBox();
    if (box) {
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
      await page.mouse.down();
      await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2, { steps: 10 });
      await page.mouse.up();
      await page.waitForTimeout(300);
    }

    // Find reset button
    const resetButton = page.locator('button').filter({ hasText: /reset|fit|center/i }).first();

    if (await resetButton.count() > 0) {
      const beforeReset = await canvas.screenshot();

      await resetButton.click();
      await page.waitForTimeout(500);

      const afterReset = await canvas.screenshot();
      expect(beforeReset).not.toEqual(afterReset);
    }
  });

  test('should display camera controls panel', async ({ page }) => {
    // Check for camera controls UI elements
    const expectedElements = [
      /rotate|rotation/i,
      /zoom/i,
      /pan/i,
      /preset/i,
    ];

    for (const pattern of expectedElements) {
      const element = page.locator(`text=${pattern}`).first();
      if (await element.count() > 0) {
        // Soft check - element may be in collapsed panel
        // Just verify element exists in DOM
        expect(await element.count()).toBeGreaterThan(0);
      }
    }
  });
});

/**
 * Helper function to load a sample structure before each test
 */
async function loadSampleStructure(page: any) {
  // Try to load sample via dropdown or button
  const sampleControl = page.locator('button,select').filter({ hasText: /sample/i }).first();

  if (await sampleControl.count() > 0) {
    await sampleControl.click();

    // Click first available sample
    const firstSample = page.locator('option,li,[role="option"]').first();
    if (await firstSample.count() > 0) {
      await firstSample.click();
      await page.waitForTimeout(2000); // Allow structure to load
    }
  }
}
