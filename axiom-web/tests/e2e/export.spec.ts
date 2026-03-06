import { expect, test } from '@playwright/test'
import * as fs from 'node:fs'
import { PNG } from 'pngjs'
import { gotoAxiom, loadSampleStructure, openInspectorTab } from './helpers'

function countNonBackgroundPixels(buffer: Buffer, background = { r: 255, g: 255, b: 255, a: 255 }) {
  const png = PNG.sync.read(buffer)
  let nonBackground = 0

  for (let i = 0; i < png.data.length; i += 4) {
    const r = png.data[i]
    const g = png.data[i + 1]
    const b = png.data[i + 2]
    const a = png.data[i + 3]

    if (r !== background.r || g !== background.g || b !== background.b || a !== background.a) {
      nonBackground += 1
    }
  }

  return { png, nonBackground }
}

test.describe('Export Functionality', () => {
  test.beforeEach(async ({ page }) => {
    await gotoAxiom(page)
    await loadSampleStructure(page)
    await openInspectorTab(page, 'Export')
  })

  test('exports a PNG snapshot', async ({ page }) => {
    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /export png/i }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/\.png$/i)
    const path = await download.path()
    if (!path) throw new Error('Download path unavailable')
    const buffer = fs.readFileSync(path)
    expect(buffer.length).toBeGreaterThan(0)

    const { png, nonBackground } = countNonBackgroundPixels(buffer)
    expect(png.width).toBe(1920)
    expect(png.height).toBe(1080)
    expect(nonBackground).toBeGreaterThan(500)
  })

  test('exports a 4k PNG snapshot', async ({ page }) => {
    const exportPanel = page.locator('.export-panel')
    const fourKOption = exportPanel.locator('option[value="4k"]')

    if (await fourKOption.isDisabled()) {
      await expect(exportPanel).toContainText(/GPU export limit/i)
      return
    }

    await exportPanel.getByRole('combobox').selectOption('4k')

    const downloadPromise = page.waitForEvent('download')
    await page.getByRole('button', { name: /export png/i }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toContain('3840x2160')
    const path = await download.path()
    if (!path) throw new Error('Download path unavailable')

    const { png, nonBackground } = countNonBackgroundPixels(fs.readFileSync(path))
    expect(png.width).toBe(3840)
    expect(png.height).toBe(2160)
    expect(nonBackground).toBeGreaterThan(1000)
  })

  test('exports the structure as PDB', async ({ page }) => {
    const exportPanel = page.locator('.export-panel')
    await exportPanel.getByRole('button', { name: /structure file/i }).click()
    await exportPanel.getByRole('combobox').selectOption('pdb')

    const downloadPromise = page.waitForEvent('download')
    await exportPanel.getByRole('button', { name: /export pdb/i }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/\.pdb$/i)
    const path = await download.path()
    if (!path) throw new Error('Download path unavailable')
    expect(fs.readFileSync(path, 'utf8')).toContain('ATOM')
  })

  test('exports the structure as CIF', async ({ page }) => {
    const exportPanel = page.locator('.export-panel')
    await exportPanel.getByRole('button', { name: /structure file/i }).click()
    await exportPanel.getByRole('combobox').selectOption('cif')

    const downloadPromise = page.waitForEvent('download')
    await exportPanel.getByRole('button', { name: /export cif/i }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/\.cif$/i)
    const path = await download.path()
    if (!path) throw new Error('Download path unavailable')
    expect(fs.readFileSync(path, 'utf8')).toContain('data_')
  })

  test('exports the scene as JSON', async ({ page }) => {
    const exportPanel = page.locator('.export-panel')
    await exportPanel.getByRole('button', { name: /^scene$/i }).click()

    const downloadPromise = page.waitForEvent('download')
    await exportPanel.getByRole('button', { name: /export scene json/i }).click()
    const download = await downloadPromise

    expect(download.suggestedFilename()).toMatch(/\.json$/i)
    const path = await download.path()
    if (!path) throw new Error('Download path unavailable')

    const scene = JSON.parse(fs.readFileSync(path, 'utf8'))
    expect(scene).toHaveProperty('camera')
    expect(scene).toHaveProperty('cameraState')
  })
})
