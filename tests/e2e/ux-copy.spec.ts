import { expect, test } from '@playwright/test'

/** ป้ายและหัวเรื่องที่เคยหลอกตา — ภาษาอังกฤษหลุด · เดือนผิด · ป้ายค้างไม่บอกว่ารวมเดือนก่อน */
test('history speaks Thai, the parent sees the month of the bill, and ค้าง says it accumulates', async ({ page }) => {
  await page.goto('?scenario=default#/app/subjects/s2')
  await expect(page.locator('.skel')).toHaveCount(0)
  const history = page.getByText('บิล ส.ค. 2568', { exact: false }).first()
  await expect(history).toContainText('ค้างจ่าย')
  await expect(history).not.toContainText('overdue')

  // บิลของคุณพ่อภูมิเป็นของ ส.ค. — หัวใบต้องบอก ส.ค. แม้วันนี้เป็น ก.ย.
  await page.goto('#/client/c2')
  await expect(page.locator('.cv__who')).toContainText('ส.ค. 2568')
  await expect(page.locator('.cv__who')).not.toContainText('ก.ย.')

  await page.goto('#/app/billing')
  await expect(page.getByText('ค้างสะสม')).toBeVisible()
  await expect(page.locator('details.hint--fold summary')).toContainText('ตัวเลขนี้มาจากไหน')
})
