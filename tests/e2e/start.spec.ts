import { expect, test } from '@playwright/test'

/** หน้าแรก → เลือกรูปแบบ → เข้าแอปด้วยข้อมูลที่ตรงแบบ · เปลี่ยนจากเมนูได้ · โหมดจริงไม่ลบข้อมูล */
test('picking a style shapes the demo, the filters and the add-sheet default; the menu can change it', async ({ page }) => {
  await page.goto('./')
  await page.getByRole('link', { name: 'เดโม' }).click()
  await expect(page).toHaveURL(/#\/start$/)
  await expect(page.locator('input, textarea, select')).toHaveCount(0) // ทางเลือก ไม่ใช่ฟอร์ม

  await page.getByRole('button', { name: /แพ็ก \/ คอร์ส/ }).click()
  await expect(page).toHaveURL(/#\/app\/today$/)
  await expect(page.locator('.skel')).toHaveCount(0)
  await expect(page.getByText('น้องโบว์')).toBeVisible()
  await expect(page.locator('.pk').first()).toBeVisible() // ตัวนับที่เหลือของแพ็ก

  await page.goto('#/app/subjects')
  const chips = page.locator('.chips').first()
  await expect(chips).toContainText('แพ็ก')
  await expect(chips).toContainText('รายครั้ง') // ชุดนี้มีรายครั้งอยู่ 2 คน จึงยังกรองได้
  await expect(chips).not.toContainText('เหมาเดือน')
  await page.getByRole('button', { name: '+ เพิ่ม' }).click()
  const sheet = page.getByRole('dialog')
  await expect(sheet.getByRole('button', { name: 'แพ็ก', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(sheet.getByText('หักจากแพ็ก', { exact: false })).toBeVisible()
  await sheet.getByRole('button', { name: 'ปิด' }).click()

  // เมนู → รูปแบบการเก็บเงิน → ผสม
  await page.getByRole('button', { name: 'เมนู' }).click()
  await page.getByRole('dialog', { name: 'เมนู' }).getByRole('button', { name: 'รูปแบบการเก็บเงิน' }).click()
  await expect(page).toHaveURL(/#\/start$/)
  await expect(page.getByText('ใช้อยู่')).toBeVisible()
  await page.getByRole('button', { name: /^ผสม/ }).click()
  await expect(page.locator('.skel')).toHaveCount(0)
  await expect(page.getByText('น้องแพรว')).toBeVisible()
})

test('in real mode the picker changes defaults only — nothing is wiped', async ({ page }) => {
  await page.goto('?scenario=default#/app/today')
  await expect(page.locator('.skel')).toHaveCount(0)
  await page.getByRole('button', { name: 'เมนู' }).click()
  await page.getByRole('dialog', { name: 'เมนู' }).getByRole('button', { name: 'เริ่มใช้จริง' }).click()
  await page.getByRole('dialog', { name: 'เริ่มใช้จริง' }).getByRole('button', { name: 'เริ่มใช้จริง' }).click()
  await page.locator('.fld').filter({ hasText: 'ชื่อที่ลูกค้าเรียกคุณ' }).locator('input').fill('ครูมายด์')
  await page.getByRole('group', { name: 'คำลงท้ายในข้อความถึงลูกค้า' }).getByRole('button', { name: 'ค่ะ' }).click()
  await page.getByRole('button', { name: 'ถัดไป' }).click()
  await page.locator('.fld').filter({ hasText: 'วางรายชื่อจาก Excel หรือ LINE' }).locator('textarea').fill('น้องปลา, คุณแม่ปลา')
  await page.getByRole('button', { name: 'เริ่มใช้งาน (1)' }).click()
  await expect(page).toHaveURL(/#\/app\/today$/)

  await page.goto('#/start')
  await expect(page.getByText('โหมดใช้จริง', { exact: false }).first()).toBeVisible()
  await page.getByRole('button', { name: /เหมารายเดือน/ }).click()
  await page.goto('#/app/subjects')
  await expect(page.getByText('น้องปลา')).toBeVisible() // ข้อมูลยังอยู่
  await page.getByRole('button', { name: '+ เพิ่ม' }).click()
  await expect(page.getByRole('dialog').getByRole('button', { name: 'เหมาเดือน', exact: true })).toHaveAttribute('aria-pressed', 'true')
})
