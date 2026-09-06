export type Theme = 'system' | 'light' | 'dark' | 'black' | 'warm'
/** ลำดับที่โชว์ในเมนู — ตามเครื่อง แล้วค่อย 4 ธีมจริง */
export const THEMES: Theme[] = ['system', 'light', 'dark', 'black', 'warm']

const KEY = 'solo-theme'

export function readTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    // โฉม Navy เป็นธีมมืดโดยตั้งใจ — ผู้ใช้เลือกแบบอื่นได้จากเมนู
    return THEMES.includes(v as Theme) ? (v as Theme) : 'dark'
  } catch {
    return 'dark'
  }
}

/** system = ถอด attribute ออก ให้ prefers-color-scheme ตัดสินเอง */
export function applyTheme(t: Theme): void {
  const root = document.documentElement
  if (t === 'system') root.removeAttribute('data-theme')
  else root.setAttribute('data-theme', t)
  try {
    localStorage.setItem(KEY, t)
  } catch {
    /* โหมดส่วนตัวเขียนไม่ได้ — ไม่เป็นไร ธีมยังใช้ได้ในหน้านี้ */
  }
}

export function systemPrefersDark(): boolean {
  return typeof matchMedia === 'function' && matchMedia('(prefers-color-scheme: dark)').matches
}

/** ดำสนิทเป็นตระกูลมืด · ครีมอุ่นเป็นตระกูลสว่าง — ใช้ตัดสินไอคอน/สลับเร็ว */
export const effectiveTheme = (t: Theme): 'light' | 'dark' =>
  t === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : t === 'black' ? 'dark' : t === 'warm' ? 'light' : t
