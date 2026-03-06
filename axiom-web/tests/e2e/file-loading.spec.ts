import { expect, test, type Page } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const quartzFixture = fileURLToPath(new URL('../../public/samples/quartz.cif', import.meta.url))

async function expectViewerReady(page: Page) {
  await expect(page.getByText('Axiom Web Viewer')).toBeVisible()
  await expect(page.locator('canvas')).toBeVisible()
}

async function loadSample(page: Page, label: string) {
  await page.getByRole('button', { name: /load example structure/i }).click()
  await expect(page.getByText(label, { exact: true })).toBeVisible()
  await page.getByText(label, { exact: true }).click()
  await expect(page.locator('body')).not.toContainText('Renderer Error')
  await expect(page.locator('body')).toContainText('Structure Information')
}

test.describe('File Loading', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await expectViewerReady(page)
  })

  test('shows the empty state before any structure is loaded', async ({ page }) => {
    await expect(page.locator('body')).toContainText('No structure loaded')
  })

  test('loads the Water sample and updates the canvas + metadata', async ({ page }) => {
    const consoleErrors: string[] = []
    const pageErrors: string[] = []

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text())
      }
    })

    page.on('pageerror', (error) => {
      pageErrors.push(error.message)
    })

    const canvas = page.locator('canvas').first()
    const beforeLoad = await canvas.screenshot()

    await loadSample(page, 'Water (H₂O)')

    await expect(page.locator('body')).toContainText('File: Water (H₂O)')
    await expect(page.locator('body')).toContainText('Atoms: 3')
    await expect(page.locator('body')).toContainText('Bonds: 2')
    await expect(page.locator('body')).toContainText('H: 2')
    await expect(page.locator('body')).toContainText('O: 1')

    const afterLoad = await canvas.screenshot()
    expect(afterLoad).not.toEqual(beforeLoad)
    expect(pageErrors).toEqual([])
    expect(consoleErrors).toEqual([])
  })

  test('uploads a CIF file through the hidden file input and shows structure details', async ({ page }) => {
    const hiddenFileInput = page.locator('input[type="file"]').first()
    await hiddenFileInput.setInputFiles(quartzFixture)

    await expect(page.locator('body')).toContainText('File: quartz.cif')
    await expect(page.locator('body')).toContainText('Atoms: 9')
    await expect(page.locator('body')).toContainText('Bonds: 6')
    await expect(page.locator('body')).toContainText('Si: 3')
    await expect(page.locator('body')).toContainText('O: 6')
    await expect(page.locator('body')).not.toContainText('Renderer Error')
  })

  test('rejects invalid file extensions before parsing', async ({ page }) => {
    const hiddenFileInput = page.locator('input[type="file"]').first()
    await hiddenFileInput.setInputFiles({
      name: 'not-a-structure.txt',
      mimeType: 'text/plain',
      buffer: Buffer.from('plain text, not a CIF file'),
    })

    await expect(page.locator('body')).toContainText('Invalid file type. Expected .cif')
    await expect(page.locator('body')).toContainText('No structure loaded')
  })
})
