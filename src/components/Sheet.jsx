import { useEffect } from 'react'

/** Bottom sheet มาตรฐานของแอป — slide-up 0.22s, ปิดด้วยแตะพื้นหลังหรือ Esc */
export default function Sheet({ title, sub, onClose, footer, children }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="veil" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
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
