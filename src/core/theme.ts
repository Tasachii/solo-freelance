export type Theme = 'light' | 'dark' | 'system'

const KEY = 'solo-theme'

export function readTheme(): Theme {
  try {
    const v = localStorage.getItem(KEY)
    // โฉม Navy เป็นธีมมืดโดยตั้งใจ — ผู้ใช้เลือก สว่าง/ตามเครื่อง ได้จากเมนู
    return v === 'light' || v === 'dark' || v === 'system' ? v : 'dark'
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

/** ธีมที่เห็นจริงบนจอตอนนี้ */
export const effectiveTheme = (t: Theme): 'light' | 'dark' =>
  t === 'system' ? (systemPrefersDark() ? 'dark' : 'light') : t
