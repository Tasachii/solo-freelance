// ค่าที่ทีมเติมก่อนส่ง (spec 0.3)
export const LEGACY_TOKEN_FILE = '' // ว่าง = ใช้ token ใน index.css (spec ข้อ 10)
export const WAITLIST_ENDPOINT = '' // Google Form formResponse URL · ว่าง = log console
export const PROVIDER_NAME = 'ครูเบนซ์'
export const PROMPTPAY_DISPLAY = '08x-xxx-xxxx'

/** mapping entry ids ของ Google Form — แก้ object นี้เมื่อมี endpoint จริง */
export const WAITLIST_FIELDS: Record<string, string> = {
  professionId: 'entry.1000001',
  name: 'entry.1000002',
  contact: 'entry.1000003',
  size: 'entry.1000004',
  modes: 'entry.1000005',
  concierge: 'entry.1000006',
}
