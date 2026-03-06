import { expect, type Locator, type Page } from '@playwright/test'

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export async function gotoAxiom(page: Page) {
  await page.goto('/')
  await expect(page.getByTestId('app-shell-header')).toContainText('Axiom Molecular Workbench')
  await expect(page.getByTestId('viewer-canvas')).toBeVisible()
}

export async function loadSampleStructure(page: Page, label = 'Water (CIF)') {
  await page.getByRole('button', { name: /load example structure/i }).click()
  await expect(page.getByText(label, { exact: true })).toBeVisible()
  await page.getByText(label, { exact: true }).click()
  await expect(page.getByTestId('structure-info')).toContainText(new RegExp(`File:\\s*${escapeRegex(label)}`))
  await expect(page.locator('body')).not.toContainText('Renderer Error')
}

export async function openInspectorTab(page: Page, label: 'Render' | 'Camera' | 'Measure' | 'Export' | 'Agent') {
  await page.getByRole('tab', { name: new RegExp(`^${label}\\b`, 'i') }).click()
}

export function viewerCanvas(page: Page): Locator {
  return page.getByTestId('viewer-canvas')
}

export function structureInfo(page: Page): Locator {
  return page.getByTestId('structure-info')
}

export async function expectMetric(page: Page, metric: 'atoms' | 'bonds' | 'selection' | 'mode', value: string | RegExp) {
  await expect(page.getByTestId(`stage-metric-${metric}`)).toContainText(value)
}
