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

  return { isDark, toggle }
}

/** จอกว้างพอเป็น "โต๊ะทำงาน" หรือยัง */
export function useIsDesk() {
  const query = '(min-width: 900px)'
  const [isDesk, setIsDesk] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia(query).matches,
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const onChange = (e) => setIsDesk(e.matches)
    mq.addEventListener('change', onChange)
    setIsDesk(mq.matches)
    return () => mq.removeEventListener('change', onChange)
  }, [])
  return isDesk
}
