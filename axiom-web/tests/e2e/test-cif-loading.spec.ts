import { expect, test } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const quartzFixture = fileURLToPath(new URL('../../public/samples/quartz.cif', import.meta.url))

test('loads samples and uploads on production without runtime failures', async ({ page }, testInfo) => {
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

  await page.goto('/')
  await expect(page.getByText('Axiom Web Viewer')).toBeVisible()
  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.locator('body')).not.toContainText('Renderer Error')

  await page.getByRole('button', { name: /load example structure/i }).click()
  await page.getByText('Water (H₂O)', { exact: true }).click()
  await expect(page.locator('body')).toContainText('File: Water (H₂O)')
  await expect(page.locator('body')).toContainText('Atoms: 3')
  await expect(page.locator('body')).toContainText('Bonds: 2')
  await expect(page.locator('body')).not.toContainText('Renderer Error')

  await page.locator('input[type="file"]').first().setInputFiles(quartzFixture)
  await expect(page.locator('body')).toContainText('File: quartz.cif')
  await expect(page.locator('body')).toContainText('Atoms: 9')
  await expect(page.locator('body')).toContainText('Bonds: 6')
  await expect(page.locator('body')).not.toContainText('Renderer Error')

  await page.screenshot({
    path: testInfo.outputPath('production-cif-validation.png'),
    fullPage: true,
  })

  expect(pageErrors).toEqual([])
  expect(consoleErrors).toEqual([])
})
