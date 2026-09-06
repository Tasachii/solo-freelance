import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { copy } from '../../copy'

export function DemoBadge() {
  // จอแคบมาก (iPhone SE 320px) โชว์แค่ "เดโม" — ส่วนขยายซ่อนด้วย CSS
  const [short, rest] = [copy.demoBadgeShort, copy.demoBadge.slice(copy.demoBadgeShort.length)]
  return <span className="demo-badge">{short}<span className="demo-badge__more">{rest}</span></span>
}

export function Skeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="skel" aria-busy="true" aria-label={copy.common.loading}>
      {Array.from({ length: rows }, (_, i) => <div key={i} className="skel__row" />)}
    </div>
  )
}

export function EmptyState({ icon, title, desc, action }: { icon: string; title: string; desc?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty__ico" aria-hidden="true">{icon}</div>
      <h3 className="empty__t">{title}</h3>
      {desc && <p className="empty__d">{desc}</p>}
      {action}
    </div>
  )
}

export function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'ok' | 'warn' | 'danger' }) {
  return (
    <div className={`stat${tone ? ` stat--${tone}` : ''}`}>
      <span className="stat__l">{label}</span>
      <b className="stat__v num">{value}</b>
    </div>
  )
}

export function Chip({ label, count, on, onClick }: { label: string; count?: number; on: boolean; onClick: () => void }) {
  return (
    <button className={`chip${on ? ' chip--on' : ''}`} aria-pressed={on} onClick={onClick}>
      {label}{count !== undefined && <span className="chip__n">{count}</span>}
    </button>
  )
}

export function ProgressBar({ value, max, tone, label = 'ความคืบหน้า' }: { value: number; max: number; tone: 'ok' | 'warn' | 'danger'; label?: string }) {
  const safeMax = Math.max(0, max)
  const safeValue = Math.min(Math.max(0, value), safeMax)
  const pct = safeMax > 0 ? (safeValue / safeMax) * 100 : 0
  return (
    <span className={`bar bar--${tone}`} role="progressbar" aria-label={label}
      aria-valuemin={0} aria-valuenow={safeValue} aria-valuemax={safeMax}>
      <i style={{ width: `${pct}%` }} />
    </span>
  )
}

export function QRPlaceholder({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="qr">
      <div className="qr__box" aria-hidden="true" />
      <div className="qr__t"><b>{label}</b>{sub && <span>{sub}</span>}</div>
    </div>
  )
}

interface IsolationSnapshot { inert: boolean; ariaHidden: string | null }
const modalStack: HTMLElement[] = []
const isolationSnapshots = new Map<HTMLElement, IsolationSnapshot>()
let bodyOverflowBeforeModal: string | null = null

function restoreIsolation() {
  for (const [element, snapshot] of isolationSnapshots) {
    if (snapshot.inert) element.setAttribute('inert', '')
    else element.removeAttribute('inert')
    if (snapshot.ariaHidden === null) element.removeAttribute('aria-hidden')
    else element.setAttribute('aria-hidden', snapshot.ariaHidden)
  }
  isolationSnapshots.clear()
}

function isolateToTopModal() {
  restoreIsolation()
  const top = modalStack[modalStack.length - 1]
  if (!top) return
  for (const element of Array.from(document.body.children) as HTMLElement[]) {
    if (element === top) continue
    isolationSnapshots.set(element, {
      inert: element.hasAttribute('inert'),
      ariaHidden: element.getAttribute('aria-hidden'),
    })
    element.setAttribute('inert', '')
    element.setAttribute('aria-hidden', 'true')
  }
}

export function BottomSheet(
  { title, sub, onClose, footer, children }:
  { title: string; sub?: string; onClose: () => void; footer?: ReactNode; children: ReactNode },
) {
  const ref = useRef<HTMLDivElement>(null)
  const layerRef = useRef<HTMLDivElement>(null)
  const closeRef = useRef(onClose)
  const titleId = useId()
  closeRef.current = onClose

  // Escape ผูกครั้งเดียว อ่าน onClose ล่าสุดผ่าน ref
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (modalStack[modalStack.length - 1] !== layerRef.current) return
      if (e.key === 'Escape') { closeRef.current(); return }
      if (e.key !== 'Tab') return
      // aria-modal บอกว่าเป็น modal แล้วต้องทำให้จริง ไม่งั้น Tab หลุดไปหน้าหลัง
      const f = ref.current?.querySelectorAll<HTMLElement>(
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')
      if (!f?.length) { e.preventDefault(); ref.current?.focus(); return }
      const first = f[0], last = f[f.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // โฟกัสตอนเปิดเท่านั้น — ถ้าผูกกับ onClose จะโฟกัสใหม่ทุกตัวอักษรที่พิมพ์
  // และต้องหาในตัวเนื้อหา ไม่งั้นไปโดนปุ่ม ✕ ที่อยู่ก่อนหน้าใน DOM
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null
    const layer = layerRef.current
    if (layer) {
      if (modalStack.length === 0) bodyOverflowBeforeModal = document.body.style.overflow
      modalStack.push(layer)
      isolateToTopModal()
    }
    document.body.style.overflow = 'hidden'
    const initial = ref.current?.querySelector<HTMLElement>('.sheet__body input,.sheet__body select,.sheet__body textarea,.sheet__body button')
    ;(initial ?? ref.current)?.focus()
    return () => {
      const index = layer ? modalStack.lastIndexOf(layer) : -1
      if (index >= 0) modalStack.splice(index, 1)
      isolateToTopModal()
      if (modalStack.length === 0) {
        document.body.style.overflow = bodyOverflowBeforeModal ?? ''
        bodyOverflowBeforeModal = null
      }
      prev?.focus?.()
    }
  }, [])

  return createPortal(
    <div className="sheet-layer" ref={layerRef}>
      <div className="veil" onClick={() => {
        if (modalStack[modalStack.length - 1] === layerRef.current) onClose()
      }} />
      <div className="sheet" role="dialog" aria-modal="true" aria-labelledby={titleId} ref={ref} tabIndex={-1}>
        <div className="sheet__grip" />
        <div className="sheet__hd">
          <div>
            <h3 className="sheet__t" id={titleId}>{title}</h3>
            {sub && <p className="sheet__s">{sub}</p>}
          </div>
          <button className="sheet__x" onClick={onClose} aria-label={copy.common.close}>✕</button>
        </div>
        <div className="sheet__body">{children}</div>
        {footer && <div className="sheet__foot">{footer}</div>}
      </div>
    </div>,
    document.body,
  )
}

/**
 * ถามยืนยันแบบชีท — แทน window.confirm ที่ Android ขึ้น "localhost says…"
 * แปลไม่ได้ และบน iOS ที่ติดตั้งลงจอมักถูกกลืนหายไปเงียบ ๆ
 */
export function ConfirmSheet(
  { title, body, hint, confirmLabel, danger, onConfirm, onClose }: {
    title: string; body?: string; hint?: string; confirmLabel: string
    danger?: boolean
    onConfirm: () => boolean | void | Promise<boolean | void>
    onClose: () => void
  },
) {
  const [submitting, setSubmitting] = useState(false)
  const submittingRef = useRef(false)
  const confirm = async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    setSubmitting(true)
    try {
      const result = await onConfirm()
      // false means the requested operation did not finish; keep the context open
      // so a cancelled backup or rejected write does not look like success.
      if (result !== false) onClose()
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }
  return (
    <BottomSheet title={title} onClose={submitting ? () => undefined : onClose}
      footer={
        <div className="btnrow">
          <button className="btn btn--ghost" disabled={submitting} onClick={onClose}>{copy.common.cancel}</button>
          <button className={`btn ${danger ? 'btn--danger' : 'btn--primary'}`}
            disabled={submitting} onClick={() => void confirm()}>{confirmLabel}</button>
        </div>
      }>
      {body && <p className="p">{body}</p>}
      {hint && <span className="hint">{hint}</span>}
    </BottomSheet>
  )
}
