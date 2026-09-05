export type Accent = 'teal' | 'forest' | 'indigo' | 'plum' | 'clay'

export const ACCENTS: Accent[] = ['teal', 'forest', 'indigo', 'plum', 'clay']
const KEY = 'solo-accent'

export function readAccent(): Accent {
  try {
    const v = localStorage.getItem(KEY)
    return ACCENTS.includes(v as Accent) ? (v as Accent) : 'teal'
  } catch {
    return 'teal'
  }
}

/** teal (เขียวอมฟ้า) เป็นค่าเริ่มต้น — ที่เหลือให้ผู้ใช้เลือกเอง */
export function applyAccent(a: Accent): void {
  const root = document.documentElement
  if (a === 'teal') root.removeAttribute('data-accent')
  else root.setAttribute('data-accent', a)
  try {
    if (a === 'teal') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, a)
  } catch {
    /* โหมดส่วนตัวเขียนไม่ได้ — สียังใช้ได้ในหน้านี้ */
  }
}
