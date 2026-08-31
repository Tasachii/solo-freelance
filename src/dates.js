/** ทุกวันที่ในระบบเก็บเป็น ISO "YYYY-MM-DD" แล้วค่อยแปลงตอนแสดงผล
    ของเดิมเก็บเป็นข้อความไทยอิสระ ทำให้เรียงไม่ได้และตัดรอบเดือนไม่ได้ */

const TH_MONTH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const TH_MONTH_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
export const TH_DAY = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']
export const TH_DAY_SHORT = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.']

const pad = (n) => String(n).padStart(2, '0')

export const iso = (y, m, d) => `${y}-${pad(m)}-${pad(d)}`
export const parse = (s) => { const [y, m, d] = s.split('-').map(Number); return { y, m, d } }
export const periodOf = (isoDate) => isoDate.slice(0, 7)
export const daysInMonth = (y, m) => new Date(y, m, 0).getDate()

/** เลขวันในสัปดาห์ 0=อาทิตย์ คำนวณเองไม่พึ่ง timezone */
export function weekday(isoDate) {
  const { y, m, d } = parse(isoDate)
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay()
}

export function shortDate(isoDate) {
  const { m, d } = parse(isoDate)
  return `${d} ${TH_MONTH_SHORT[m - 1]}`
}

export function longMonth(period) {
  const [y, m] = period.split('-').map(Number)
  return `${TH_MONTH_FULL[m - 1]} ${y + 543}`
}

export function shortMonth(period) {
  const [, m] = period.split('-').map(Number)
  return TH_MONTH_SHORT[m - 1]
}

export function shiftPeriod(period, delta) {
  const [y, m] = period.split('-').map(Number)
  const total = y * 12 + (m - 1) + delta
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`
}

/** ทุกวันที่ในเดือนนั้นที่ตรงกับวันในสัปดาห์ที่กำหนด */
export function datesOfWeekdayInMonth(period, day) {
  const [y, m] = period.split('-').map(Number)
  const out = []
  for (let d = 1; d <= daysInMonth(y, m); d++) {
    const date = iso(y, m, d)
    if (weekday(date) === day) out.push(date)
  }
  return out
}
