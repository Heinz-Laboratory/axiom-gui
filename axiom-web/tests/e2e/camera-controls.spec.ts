import { expect, test } from '@playwright/test'
import { gotoAxiom, loadSampleStructure, viewerCanvas } from './helpers'

test.describe('Camera Controls', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAxiom(page)
    await loadSampleStructure(page)
  })

  test('rotates the scene with mouse drag', async ({ page }) => {
    const canvas = viewerCanvas(page)
    const before = await canvas.screenshot()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas box unavailable')

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 - 40, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(300)

    const after = await canvas.screenshot()
    expect(after).not.toEqual(before)
  })

  test('zooms the scene with the mouse wheel', async ({ page }) => {
    const canvas = viewerCanvas(page)
    const before = await canvas.screenshot()

    await canvas.hover()
    await page.mouse.wheel(0, -500)
    await page.waitForTimeout(300)

    const after = await canvas.screenshot()
    expect(after).not.toEqual(before)
  })

  test('pans the scene with middle mouse drag', async ({ page }) => {
    const canvas = viewerCanvas(page)
    const before = await canvas.screenshot()
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas box unavailable')

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down({ button: 'middle' })
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 - 60, { steps: 10 })
    await page.mouse.up({ button: 'middle' })
    await page.waitForTimeout(300)

    const after = await canvas.screenshot()
    expect(after).not.toEqual(before)
  })

  test('applies a built-in preset view', async ({ page }) => {
    const canvas = viewerCanvas(page)
    const before = await canvas.screenshot()

    await page.getByRole('button', { name: /camera preset: top/i }).click()
    await page.waitForTimeout(700)

    const after = await canvas.screenshot()
    expect(after).not.toEqual(before)
  })

  test('saves and restores a custom camera preset', async ({ page }) => {
    const canvas = viewerCanvas(page)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas box unavailable')

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 100, box.y + box.height / 2, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(300)

    await page.getByRole('button', { name: /save current view/i }).click()
    await page.getByPlaceholder(/preset name/i).fill('Test View')
    await page.getByRole('button', { name: /^save$/i }).click()

    const savedPresetButton = page.locator('.custom-preset-item .preset-btn', { hasText: 'Test View' })
    await expect(savedPresetButton).toBeVisible()
    await page.getByRole('button', { name: /camera preset: front/i }).click()
    await page.waitForTimeout(500)

    const beforeRestore = await canvas.screenshot()
    await savedPresetButton.click()
    await page.waitForTimeout(700)
    const afterRestore = await canvas.screenshot()

    expect(afterRestore).not.toEqual(beforeRestore)
  })

  test('fits and resets the camera from the control panel', async ({ page }) => {
    const canvas = viewerCanvas(page)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas box unavailable')

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 - 40, { steps: 10 })
    await page.mouse.up()
    await page.waitForTimeout(300)

    const moved = await canvas.screenshot()
    const controlsPanel = page.locator('.camera-controls-panel')
    await controlsPanel.getByRole('button', { name: /fit to view/i }).click()
    await page.waitForTimeout(300)
    const fit = await canvas.screenshot()
    expect(fit).not.toEqual(moved)

    await controlsPanel.getByRole('button', { name: /reset/i }).click()
    await expect(page.getByTestId('status-message')).toContainText(/camera reset|home view/i)
  })
})
