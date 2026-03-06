import { expect, test, type Page } from '@playwright/test'
import * as fs from 'node:fs'
import { gotoAxiom, loadSampleStructure, openInspectorTab, viewerCanvas } from './helpers'

interface CameraState {
  eye: [number, number, number]
  target: [number, number, number]
  up: [number, number, number]
  fovy: number
}

function distance(a: [number, number, number], b: [number, number, number]) {
  return Math.sqrt(
    (a[0] - b[0]) ** 2
    + (a[1] - b[1]) ** 2
    + (a[2] - b[2]) ** 2,
  )
}

function expectVectorClose(
  actual: [number, number, number],
  expected: [number, number, number],
  tolerance = 0.01,
) {
  actual.forEach((value, index) => {
    expect(value).toBeCloseTo(expected[index], Math.abs(Math.log10(tolerance)))
  })
}

async function exportCameraState(page: Page): Promise<CameraState> {
  await openInspectorTab(page, 'Export')

  const exportPanel = page.locator('.export-panel')
  await exportPanel.getByRole('button', { name: /^scene$/i }).click()

  const downloadPromise = page.waitForEvent('download')
  await exportPanel.getByRole('button', { name: /export scene json/i }).click()
  const download = await downloadPromise
  const path = await download.path()

  if (!path) {
    throw new Error('Download path unavailable')
  }

  const scene = JSON.parse(fs.readFileSync(path, 'utf8'))
  return (scene.cameraState ?? scene.camera) as CameraState
}

test.describe('Camera Controls', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAxiom(page)
    await loadSampleStructure(page, 'Crambin (1CRN PDB)')
    await page.waitForTimeout(1800)
  })

  test('rotates the scene with mouse drag', async ({ page }) => {
    const before = await exportCameraState(page)
    const canvas = viewerCanvas(page)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas box unavailable')

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 120, box.y + box.height / 2 - 40, { steps: 12 })
    await page.mouse.up()
    await page.waitForTimeout(700)

    const after = await exportCameraState(page)
    expect(after.eye).not.toEqual(before.eye)
  })

  test('zooms the scene with the mouse wheel', async ({ page }) => {
    const before = await exportCameraState(page)
    const canvas = viewerCanvas(page)

    await canvas.hover()
    await page.mouse.wheel(0, -1200)
    await page.waitForTimeout(700)

    const after = await exportCameraState(page)
    expect(distance(after.eye, after.target)).toBeLessThan(distance(before.eye, before.target))
  })

  test('pans the scene with middle mouse drag', async ({ page }) => {
    const before = await exportCameraState(page)
    const canvas = viewerCanvas(page)
    const box = await canvas.boundingBox()
    if (!box) throw new Error('Canvas box unavailable')

    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down({ button: 'middle' })
    await page.mouse.move(box.x + box.width / 2 + 80, box.y + box.height / 2 - 60, { steps: 10 })
    await page.mouse.up({ button: 'middle' })
    await page.waitForTimeout(700)

    const after = await exportCameraState(page)
    expect(after.target).not.toEqual(before.target)
    expect(after.eye).not.toEqual(before.eye)
  })

  test('applies a built-in preset view', async ({ page }) => {
    const before = await exportCameraState(page)

    await openInspectorTab(page, 'Camera')
    await page.getByRole('button', { name: /camera preset: top/i }).click()
    await page.waitForTimeout(700)

    const after = await exportCameraState(page)
    expect(after.eye).not.toEqual(before.eye)
  })

  test('saves and restores a custom camera preset', async ({ page }) => {
    await openInspectorTab(page, 'Camera')
    await page.getByRole('button', { name: /camera preset: top/i }).click()
    await page.waitForTimeout(700)

    const savedView = await exportCameraState(page)

    await openInspectorTab(page, 'Camera')
    await page.getByRole('button', { name: /save current view/i }).click()
    await page.getByPlaceholder(/preset name/i).fill('Test View')
    await page.getByRole('button', { name: /^save$/i }).click()

    const savedPresetButton = page.locator('.custom-preset-item .preset-btn', { hasText: 'Test View' })
    await expect(savedPresetButton).toBeVisible()
    await page.getByRole('button', { name: /camera preset: front/i }).click()
    await page.waitForTimeout(700)

    const frontView = await exportCameraState(page)

    await openInspectorTab(page, 'Camera')
    await savedPresetButton.click()
    await page.waitForTimeout(700)

    const restoredView = await exportCameraState(page)

    expect(frontView.eye).not.toEqual(savedView.eye)
    expectVectorClose(restoredView.eye, savedView.eye)
    expectVectorClose(restoredView.target, savedView.target)
  })

  test('fits and resets the camera from the control panel', async ({ page }) => {
    const canvas = viewerCanvas(page)
    await canvas.hover()
    await page.mouse.wheel(0, 1200)
    await page.waitForTimeout(700)

    const moved = await exportCameraState(page)

    await openInspectorTab(page, 'Camera')
    const controlsPanel = page.locator('.camera-controls-panel')
    await controlsPanel.getByRole('button', { name: /fit to view/i }).click()
    await page.waitForTimeout(500)

    const fit = await exportCameraState(page)
    expect(fit.eye).not.toEqual(moved.eye)

    await openInspectorTab(page, 'Camera')
    await controlsPanel.getByRole('button', { name: /reset/i }).click()
    await expect(page.getByTestId('status-message')).toContainText(/camera reset|home view/i)
  })
})
