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

  const push = useCallback((t: Omit<ToastItem, 'id'>) => {
    seq.current += 1
    const item: ToastItem = { ...t, id: seq.current }
    setItems((prev) => [...prev, item].slice(-2)) // ซ้อนได้ไม่เกิน 2
  }, [])

  useEffect(() => {
    if (!items.length) return
    const timers = items.map((it) =>
      window.setTimeout(() => setItems((p) => p.filter((x) => x.id !== it.id)), it.tone === 'danger' ? 6000 : 3000))
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [items])

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
