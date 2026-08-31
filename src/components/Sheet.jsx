import { useEffect, useRef } from 'react'

const FOCUSABLE = 'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea, a[href], [tabindex]:not([tabindex="-1"])'

/** Bottom sheet บนมือถือ / modal กลางจอบนเดสก์ท็อป
    จัดการ focus ครบ: ย้ายเข้าเมื่อเปิด ขังไว้ข้างใน แล้วคืนที่เดิมเมื่อปิด */
export default function Sheet({ title, sub, onClose, footer, children }) {
  const box = useRef(null)
  const returnTo = useRef(null)

  useEffect(() => {
    returnTo.current = document.activeElement
    const el = box.current
    if (el) {
      const first = el.querySelector(FOCUSABLE)
      ;(first || el).focus({ preventScroll: true })
    }
    return () => {
      const back = returnTo.current
      if (back && document.contains(back)) back.focus({ preventScroll: true })
    }
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') return onClose()
      if (e.key !== 'Tab') return
      const el = box.current
      if (!el) return
      const items = [...el.querySelectorAll(FOCUSABLE)].filter((n) => n.offsetParent !== null)
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      // ขัง Tab ไว้ในชีต ไม่ให้หลุดไปโดนปุ่มที่อยู่ข้างหลัง
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
      else if (!el.contains(document.activeElement)) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [onClose])

  return (
    <>
      <div className="veil" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={box} tabIndex={-1}>
        <div className="sheet__grip" />
        <div className="sheet__head">
          <div>
            <h3 className="sheet__title">{title}</h3>
            {sub && <div className="sheet__sub">{sub}</div>}
          </div>
          <button className="sheet__x" onClick={onClose} aria-label="ปิด">✕</button>
        </div>
        <div className={footer ? 'sheet__body' : 'sheet__body sheet__body--last'}>{children}</div>
        {footer && <div className="sheet__foot">{footer}</div>}
      </div>
    </>
  )
}
