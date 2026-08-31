import { useCallback, useEffect, useState } from 'react'

const KEY = 'tutordai-theme'

/** ธีม: ตามระบบเป็นค่าเริ่มต้น จนกว่าผู้ใช้จะเลือกเอง แล้วจำไว้ */
export function useTheme() {
  const [choice, setChoice] = useState(() => {
    try {
      const saved = localStorage.getItem(KEY)
      return saved === 'light' || saved === 'dark' ? saved : 'system'
    } catch {
      return 'system'
    }
  })

  useEffect(() => {
    const root = document.documentElement
    if (choice === 'system') root.removeAttribute('data-theme')
    else root.setAttribute('data-theme', choice)
    try {
      if (choice === 'system') localStorage.removeItem(KEY)
      else localStorage.setItem(KEY, choice)
    } catch {
      /* โหมดส่วนตัวเขียนไม่ได้ — ธีมยังใช้ได้ในรอบนี้ */
    }
  }, [choice])

  const isDark =
    choice === 'dark' ||
    (choice === 'system' &&
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches)

  const toggle = useCallback(() => setChoice(isDark ? 'light' : 'dark'), [isDark])

  return { choice, setChoice, isDark, toggle }
}

/** จอกว้างพอเป็น "โต๊ะทำงาน" หรือยัง

   ใช้ matchMedia เป็นแหล่งความจริงเสมอ เพื่อให้ตรงกับ media query ใน CSS เป๊ะ
   แต่ subscribe หลายทาง เพราะ webview บางตัวไม่ยิง change/resize ตอนขนาดเปลี่ยน
   ถ้าพลาดจะค้างคนละ layout จนกว่าจะรีโหลด */
export function useIsDesk() {
  const query = '(min-width: 900px)'
  const [isDesk, setIsDesk] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(query)
    const sync = () => setIsDesk(mq.matches)

    mq.addEventListener('change', sync)
    window.addEventListener('resize', sync)
    window.addEventListener('orientationchange', sync)

    // ResizeObserver จับการเปลี่ยนขนาดของ layout จริง ยิงแม้ event ข้างบนเงียบ
    const ro = new ResizeObserver(sync)
    ro.observe(document.documentElement)

    sync()
    return () => {
      mq.removeEventListener('change', sync)
      window.removeEventListener('resize', sync)
      window.removeEventListener('orientationchange', sync)
      ro.disconnect()
    }
  }, [])

  return isDesk
}
