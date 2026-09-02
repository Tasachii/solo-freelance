// แสดงผลวันที่/เงินแบบไทย — เก็บ ค.ศ. ภายใน แสดง พ.ศ. เสมอ
const TH_MONTH_SHORT = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.']
const TH_MONTH_FULL = ['มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน', 'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม']
export const TH_DAY = ['อาทิตย์', 'จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์', 'เสาร์']

const nf = new Intl.NumberFormat('en-US')
export const money = (n: number): string => nf.format(Math.round(n))

export function parseISO(d: string): { y: number; m: number; day: number } {
  const [y, m, day] = d.split('-').map(Number)
  return { y, m, day }
}
export const pad = (n: number): string => String(n).padStart(2, '0')
export const iso = (y: number, m: number, d: number): string => `${y}-${pad(m)}-${pad(d)}`
export const periodOf = (d: string): string => d.slice(0, 7)

export function weekday(d: string): number {
  const { y, m, day } = parseISO(d)
  return new Date(Date.UTC(y, m - 1, day)).getUTCDay()
}
export function addDays(d: string, n: number): string {
  const { y, m, day } = parseISO(d)
  const t = new Date(Date.UTC(y, m - 1, day + n))
  return iso(t.getUTCFullYear(), t.getUTCMonth() + 1, t.getUTCDate())
}
export function diffDays(a: string, b: string): number {
  const pa = parseISO(a); const pb = parseISO(b)
  return Math.round((Date.UTC(pa.y, pa.m - 1, pa.day) - Date.UTC(pb.y, pb.m - 1, pb.day)) / 86400000)
}
/** "2 ก.ย." */
export function dateThai(d: string): string {
  const { m, day } = parseISO(d)
  return `${day} ${TH_MONTH_SHORT[m - 1]}`
}
/** "อังคาร" */
export const dayThai = (d: string): string => TH_DAY[weekday(d)]
/** period "2025-09" → "ก.ย. 2568" */
export function periodThai(period: string): string {
  const [y, m] = period.split('-').map(Number)
  return `${TH_MONTH_SHORT[m - 1]} ${y + 543}`
}
/** "กันยายน 2568" */
export function periodThaiFull(period: string): string {
  const [y, m] = period.split('-').map(Number)
  return `${TH_MONTH_FULL[m - 1]} ${y + 543}`
}
/** "วันอังคารที่ 2 กันยายน 2568" */
export function dateThaiFull(d: string): string {
  const { y, m, day } = parseISO(d)
  return `วัน${TH_DAY[weekday(d)]}ที่ ${day} ${TH_MONTH_FULL[m - 1]} ${y + 543}`
}
