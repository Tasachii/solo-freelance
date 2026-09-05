import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'

export interface ToastAction { label: string; run: () => void }
export interface ToastItem {
  id: number; text: string; tone?: 'ok' | 'warn' | 'danger'; action?: ToastAction
}

interface ToastValue { push: (t: Omit<ToastItem, 'id'>) => void }
const Ctx = createContext<ToastValue | null>(null)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])
  const seq = useRef(0)

  const timers = useRef<number[]>([])

  const push = useCallback((t: Omit<ToastItem, 'id'>) => {
    seq.current += 1
    const id = seq.current
    const item: ToastItem = { ...t, id }
    // เบียดเฉพาะตัวที่ไม่มีปุ่มถอย — ทิ้ง undo ไปคือทิ้งทางเดียวที่ผู้ใช้แก้ได้
    setItems((prev) => {
      const next = [...prev, item]
      if (next.length <= 3) return next
      const i = next.findIndex((x) => !x.action)
      return i === -1 ? next.slice(-3) : [...next.slice(0, i), ...next.slice(i + 1)]
    })
    // ตั้งเวลาของตัวเองตอนเกิด — ถ้าไปตั้งใน effect ที่ผูกกับ items
    // toast ใหม่จะรีเซ็ตเวลาของอันเก่า ทำให้ค้างทับแถบแท็บ
    timers.current.push(window.setTimeout(
      () => setItems((p) => p.filter((x) => x.id !== id)),
      t.tone === 'danger' ? 6000 : 3000))
  }, [])

  useEffect(() => () => { timers.current.forEach(window.clearTimeout) }, [])

  const value = useMemo(() => ({ push }), [push])
  return (
    <Ctx.Provider value={value}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast${t.tone ? ` toast--${t.tone}` : ''}`}>
            <span className="toast__t">{t.text}</span>
            {t.action && (
              <button className="toast__b" onClick={() => { t.action!.run(); setItems((p) => p.filter((x) => x.id !== t.id)) }}>
                {t.action.label}
              </button>
            )}
          </div>
        ))}
      </div>
    </Ctx.Provider>
  )
}

export function useToast(): ToastValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useToast must be used inside ToastProvider')
  return v
}
