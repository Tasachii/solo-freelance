export type DisplaySize = 'sm' | 'lg' | 'xl'

const KEY = 'solo-size'
const SIZES: DisplaySize[] = ['sm', 'lg', 'xl']

export function readSize(): DisplaySize {
  try {
    const v = localStorage.getItem(KEY)
    return SIZES.includes(v as DisplaySize) ? (v as DisplaySize) : 'sm'
  } catch {
    return 'sm'
  }
}

/** sm = มือถือปกติ · lg = อ่านง่ายขึ้น · xl = ฉายขึ้นจอตอนพรีเซนต์ */
export function applySize(s: DisplaySize): void {
  const root = document.documentElement
  if (s === 'sm') root.removeAttribute('data-size')
  else root.setAttribute('data-size', s)
  try {
    if (s === 'sm') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, s)
  } catch {
    /* โหมดส่วนตัวเขียนไม่ได้ — ขนาดยังใช้ได้ในหน้านี้ */
  }
}
