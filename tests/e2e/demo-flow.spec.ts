import { expect, test, type Page } from '@playwright/test'

/**
 * เดินเส้นทางเดโมทั้งเส้นบน build จริง
 * ทุกเทสโหลดด้วย ?scenario=default เพื่อให้ได้ข้อมูลชุดใหม่ ไม่ติดค่าจาก localStorage
 */
const open = async (page: Page, hash: string): Promise<void> => {
  await page.goto(`?scenario=default#${hash}`)
  await expect(page.locator('.skel')).toHaveCount(0)
}

test('หน้าแรกมีทางเข้าเดียว ไม่ใช่เมนูให้เลือก', async ({ page }) => {
  await page.goto('./')
  await expect(page.getByText('เดโม · ข้อมูลสมมติ').first()).toBeVisible()

  // ทางเข้าแอปต้องมีปุ่มเดียว ไม่มีปุ่มซ้ำไปที่เดียวกัน
  await expect(page.locator('a[href$="/app/today"]')).toHaveCount(1)

  // อาชีพที่ยังไม่เปิดบอกให้รู้ได้ แต่ต้องไม่ทำเป็นตัวเลือกให้กด
  await expect(page.locator('.soonline')).toContainText('Solo Nail')
  await expect(page.locator('.picker__i')).toHaveCount(0)

  // ของสำหรับนำเสนอไม่ควรอยู่หน้าที่ผู้ใช้เข้ามาใช้งาน
  await expect(page.locator('.engine')).toHaveCount(0)
})

test('ตาราง engine อยู่หน้า pitch และสร้างจาก vocab จริง', async ({ page }) => {
  await page.goto('#/pitch')
  await expect(page.locator('.engine tbody tr').first()).toContainText('ผู้ปกครอง')
})

test('วันนี้มี 4 คาบ ยืนยันแล้ว 1 รอ 3', async ({ page }) => {
  await open(page, '/app/today')
  await expect(page.locator('.urow')).toHaveCount(4)
  await expect(page.locator('.urow--done')).toHaveCount(1)
  await expect(page.locator('.stat').nth(2)).toContainText('3')
})

test('เช็คชื่อคาบที่แพ็กหมดแล้ว ได้คำเตือนและร่างชวนต่อเพิ่มมาหนึ่งใบ', async ({ page }) => {
  await open(page, '/app/today')
  await expect(page.locator('.tab__badge')).toHaveText('3')

  const row = page.locator('.urow').filter({ hasText: 'น้องกัน' })
  await row.getByRole('button', { name: 'เช็คชื่อ' }).click()

  await expect(page.locator('.toast')).toContainText('หมดแล้ว')
  await expect(page.locator('.tab__badge')).toHaveText('4')
})

test('ปิดยอดเดือนนี้สร้างบิลให้ 5 คน', async ({ page }) => {
  await open(page, '/app/billing')
  const close = page.getByRole('button', { name: /ปิดยอดเดือนนี้/ })
  await expect(close).toContainText('(5)')
  await close.click()
  // เป็นการสร้างบิลจริง จึงถามยืนยันก่อนหนึ่งชั้น
  await page.locator('.sheet').getByRole('button', { name: 'ยืนยัน' }).click()
  await expect(page.getByRole('button', { name: /ปิดยอดเดือนนี้/ })).toHaveCount(0)
})

test('สลิปตรงยอด ยืนยันแล้วได้ใบเสร็จ', async ({ page }) => {
  await open(page, '/app/billing')
  await page.locator('.srow').filter({ hasText: 'น้องภูมิ' })
    .getByRole('button', { name: /แนบสลิป/ }).click()

  await page.getByRole('button', { name: 'เลือกรูปสลิป' }).click()
  const confirm = page.getByRole('button', { name: /ยืนยันรับยอด|รับยอดตามสลิป|ยืนยันเอง/ })
  await expect(confirm).toBeVisible({ timeout: 10_000 })

  // การกดซ้ำทดสอบที่ระดับ reducer แทน (tests/unit/reducer.test.ts)
  // เพราะพอกดครั้งแรกชีทก็ถูกถอดออกจาก DOM แล้ว คลิกถัดไปไม่ถึงปุ่มจริง
  await confirm.click()
  await open(page, '/app/receipts')
  await expect(page.locator('.rows > li').filter({ hasText: /SL-\d{4}-\d{4}/ })).toHaveCount(1)
})

test('ข้อความถึงผู้ปกครองใช้ลิงก์เต็ม และไม่ซ้ำคำนำหน้า', async ({ page }) => {
  await open(page, '/app/admin')
  const drafts = page.locator('.msg__body')
  await expect(drafts.first()).toBeVisible()

  for (const text of await drafts.allInnerTexts()) {
    expect(text, 'ห้ามเติมคำนำหน้าซ้ำ').not.toMatch(/คุณคุณ/)
    expect(text, 'ห้ามเหลือตัวแปรที่ยังไม่ถูกแทนค่า').not.toMatch(/\{[a-zA-Z]+\}/)
    if (text.includes('/client/')) {
      expect(text, 'ลิงก์ต้องกดได้จากแชท').toMatch(/https?:\/\/[^\s]+\/#\/client\//)
    }
  }
})

test('ผู้จ่ายกดลิงก์แล้วเจอบิลใบที่ทวง พร้อม QR', async ({ page }) => {
  await open(page, '/client/c4')
  await expect(page.locator('.cbanner')).toContainText('มุมมองผู้จ่าย')
  await expect(page.locator('.cv__lines--sum')).toContainText('2,800')
  await expect(page.locator('.cv__pay')).toBeVisible()
  await expect(page.getByText('เดโม · ข้อมูลสมมติ')).toBeVisible()
})

test('ไม่มีข้อความไหนส่งออกโดยผู้ใช้ไม่ได้กดส่ง', async ({ page }) => {
  await open(page, '/app/admin')
  const before = await page.locator('.msg').count()
  await page.reload()
  await expect(page.locator('.skel')).toHaveCount(0)
  await expect(page.locator('.msg')).toHaveCount(before)   // โหลดใหม่ไม่ทำให้ร่างหายไปเอง
})
