// ═══════════════════════════════════════════════════════════════════
//  เก็บ contact ของติวเตอร์ที่สนใจ → ส่งเข้า Google Form
//
//  วิธีตั้งค่า (ทำครั้งเดียว):
//  1. สร้าง Google Form ที่มีคำถาม 6 ข้อตามลำดับใน FORM_FIELDS ด้านล่าง
//  2. เปิดฟอร์ม → คลิกขวา "ดูซอร์ส" (view-source) แล้วค้นหา "entry."
//     จะเจอเลข entry ของแต่ละคำถาม เช่น entry.123456789
//  3. เอา URL ของฟอร์มมาแก้ให้ลงท้ายด้วย /formResponse
//     ตัวอย่าง: https://docs.google.com/forms/d/e/1FAIpQLSxxxx/formResponse
//  4. วาง URL ใน FORM_ENDPOINT และใส่เลข entry ใน FORM_FIELDS
//
//  ถ้า FORM_ENDPOINT ว่าง ระบบจะ log ลง console แทนการส่งจริง
//  (ปลอดภัยสำหรับเดโม — ไม่มีข้อมูลหลุดออกไปไหน)
// ═══════════════════════════════════════════════════════════════════

export const FORM_ENDPOINT = ''

export const FORM_FIELDS = {
  name: 'entry.1000001',      // ชื่อ
  contact: 'entry.1000002',   // LINE ID หรือเบอร์
  students: 'entry.1000003',  // จำนวนนักเรียนที่สอนอยู่
  subjects: 'entry.1000004',  // สอนวิชาอะไร
  wantsHelp: 'entry.1000005', // สนใจให้ทีมทำให้ฟรี 1 รอบบิล
  plan: 'entry.1000006',      // แพ็กที่สนใจ (ถ้ากดมาจากหน้าราคา)
  mode: 'entry.1000007',      // ตอนนี้เก็บเงินแบบไหน (รายเดือน/แพ็ก/ทั้งคู่)
}

export const LEAD_FLAG = 'tutordai-lead-sent'

export function hasSentLead() {
  try { return localStorage.getItem(LEAD_FLAG) === '1' } catch { return false }
}

export function markLeadSent() {
  try { localStorage.setItem(LEAD_FLAG, '1') } catch { /* โหมดส่วนตัวเขียนไม่ได้ */ }
}

/**
 * ส่งข้อมูลเข้า Google Form
 * ใช้ mode:'no-cors' เพราะ Google ไม่ส่ง CORS header กลับมา
 * ผลที่ได้จะเป็น opaque response — อ่าน status ไม่ได้ ถือว่าส่งสำเร็จถ้าไม่ throw
 */
export async function submitLead(data) {
  if (!FORM_ENDPOINT) {
    console.info('[solo-tutor] ยังไม่ได้ตั้ง FORM_ENDPOINT — ข้อมูลที่จะส่งคือ:', data)
    await new Promise((r) => setTimeout(r, 600))
    return { ok: true, mode: 'console' }
  }

  const body = new URLSearchParams()
  for (const [key, field] of Object.entries(FORM_FIELDS)) {
    if (data[key] !== undefined && data[key] !== '') body.append(field, String(data[key]))
  }

  await fetch(FORM_ENDPOINT, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  })
  return { ok: true, mode: 'form' }
}
