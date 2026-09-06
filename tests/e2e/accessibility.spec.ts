import { expect, test, type Page } from './fixtures'

async function open(page: Page, path: string) {
  const target = `?scenario=default#${path}`
  await page.goto(target)
  await expect(page.locator('.skel')).toHaveCount(0)
}

test('bottom sheet traps focus and isolates the page behind it', async ({ page }) => {
  await open(page, '/app/subjects')
  await expect(page.getByRole('progressbar').first()).toBeVisible()

  await page.getByRole('button', { name: '+ เพิ่ม' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(dialog).toHaveAccessibleName(/นักเรียน/)
  await expect(page.locator('#root')).toHaveAttribute('inert', '')
  await expect(dialog.locator('input').first()).toBeFocused()

  const close = dialog.getByRole('button', { name: 'ปิด' })
  const save = dialog.getByRole('button', { name: 'บันทึก' })
  await save.focus()
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused()
  await page.keyboard.press('Shift+Tab')
  await expect(save).toBeFocused()

  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(page.locator('#root')).not.toHaveAttribute('inert', '')
})

for (const width of [320, 390]) {
  test(`bottom sheet stays inside a ${width}px viewport without runtime errors`, async ({ page }) => {
    const errors: string[] = []
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()) })
    page.on('pageerror', (error) => errors.push(error.message))
    await page.setViewportSize({ width, height: 760 })
    await open(page, '/app/subjects')
    await page.getByRole('button', { name: '+ เพิ่ม' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      document: document.documentElement.scrollWidth,
      sheet: document.querySelector('.sheet')?.getBoundingClientRect().toJSON(),
    }))
    expect(dimensions.document).toBeLessThanOrEqual(dimensions.viewport)
    expect(dimensions.sheet?.left).toBeGreaterThanOrEqual(0)
    expect(dimensions.sheet?.right).toBeLessThanOrEqual(width)
    expect(errors).toEqual([])
  })
}
