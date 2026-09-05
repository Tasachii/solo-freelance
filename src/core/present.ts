export type Frame = 'phone' | 'web'

const KEY = 'solo-frame'

/** phone = กรอบมือถือกลางจอ (เหมือนถือเครื่องอยู่) · web = เต็มความกว้าง */
export function readFrame(): Frame {
  try {
    return localStorage.getItem(KEY) === 'web' ? 'web' : 'phone'
  } catch {
    return 'phone'
  }
}

export function applyFrame(f: Frame): void {
  const root = document.documentElement
  if (f === 'phone') root.removeAttribute('data-frame')
  else root.setAttribute('data-frame', f)
  try {
    if (f === 'phone') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, f)
  } catch {
    /* โหมดส่วนตัวเขียนไม่ได้ */
  }
}

export const isFullscreen = (): boolean => !!document.fullscreenElement

export async function toggleFullscreen(): Promise<void> {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  } catch {
    /* บางเบราว์เซอร์ไม่อนุญาต — ไม่ใช่เรื่องคอขาดบาดตาย */
  }
}
