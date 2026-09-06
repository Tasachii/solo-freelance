export type Accent = 'sky' | 'teal' | 'forest' | 'indigo' | 'plum' | 'clay'

export const ACCENTS: Accent[] = ['sky', 'teal', 'forest', 'indigo', 'plum', 'clay']
const KEY = 'solo-accent'
const DEFAULT: Accent = 'sky'

export function readAccent(): Accent {
  try {
    const v = localStorage.getItem(KEY)
    return ACCENTS.includes(v as Accent) ? (v as Accent) : DEFAULT
  } catch {
    return DEFAULT
  }
}

/** sky (ฟ้าเพอริวิงเคิล) เป็นค่าเริ่มต้นของโฉม Navy — ที่เหลือให้ผู้ใช้เลือกเอง */
export function applyAccent(a: Accent): void {
  const root = document.documentElement
  if (a === DEFAULT) root.removeAttribute('data-accent')
  else root.setAttribute('data-accent', a)
  try {
    if (a === DEFAULT) localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, a)
  } catch {
    /* โหมดส่วนตัวเขียนไม่ได้ — สียังใช้ได้ในหน้านี้ */
  }
}
