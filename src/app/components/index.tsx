import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
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

export function EmptyState({ icon, title, desc, action, art }: { icon: string; title: string; desc?: string; action?: ReactNode; art?: boolean }) {
  return (
    <div className="empty">
      {art ? <Silhouette /> : <div className="empty__ico" aria-hidden="true">{icon}</div>}
      <h3 className="empty__t">{title}</h3>
      {desc && <p className="empty__d">{desc}</p>}
      {action}
    </div>
  )
}

export function StatCard({ label, value, tone }: { label: string; value: string; tone?: 'brand' | 'ok' | 'warn' | 'danger' }) {
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
      const el = e.target as HTMLElement | null
      const typing = !!el && /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)
      // ลูกศรซ้าย/ขวาบนแท็บหรือชิป = เลื่อนในกลุ่มเดียวกันและเลือกทันที
      if ((e.key === 'ArrowLeft' || e.key === 'ArrowRight') && el && !typing) {
        const group = el.closest('[role="tablist"], .chips, .seg')
        if (group && ref.current?.contains(group)) {
          const items = [...group.querySelectorAll<HTMLElement>('button:not([disabled])')]
          const i = items.indexOf(el)
          if (i >= 0) {
            e.preventDefault()
            const next = items[(i + (e.key === 'ArrowRight' ? 1 : items.length - 1)) % items.length]
            next.focus(); if (next.getAttribute('role') === 'tab') next.click()
            return
          }
        }
      }
      // ลูกศรขึ้น/ลง = เลื่อนโฟกัสไล่ตามปุ่มในชีท (วนรอบ) — เมนูยาวใช้คีย์บอร์ดได้จริง
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && !typing) {
        const items = [...(ref.current?.querySelectorAll<HTMLElement>(
          'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled])') ?? [])]
        if (!items.length) return
        e.preventDefault()
        const i = items.indexOf(document.activeElement as HTMLElement)
        const next = i < 0 ? items[0] : items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]
        next.focus()
        return
      }
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

/** ไอคอนเส้นชุดเดียวกันทั้งแอป — ไม่ใช้อีโมจิในที่ที่ต้องดูเป็นมืออาชีพ */
const ICONS = {
  cal: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
  users: 'M9 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7zM2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6M17 11.5a2.5 2.5 0 1 0 0-5M16 14.5c3 0 5.5 2 5.5 5',
  bill: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
  chat: 'M4 5h16v11H9l-5 4zM8 9h8M8 12h5',
  spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z',
  check: 'M5 12.5l4.5 4.5L19 7',
  shield: 'M12 3l8 3v6c0 4.5-3.4 8-8 9-4.6-1-8-4.5-8-9V6zM9 12l2 2 4-4',
  send: 'M4 12l16-8-6 16-2.5-6z',
  arrow: 'M5 12h14M13 6l6 6-6 6',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  moon: 'M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z',
  palette: 'M12 3a9 9 0 1 0 0 18h1.5a2.5 2.5 0 0 0 0-5H12a2 2 0 0 1 0-4h5a4 4 0 0 0 4-4 5 5 0 0 0-9-5zM7.5 12.5h.01M9.5 8.5h.01M14.5 7.5h.01',
} as const
export type IconName = keyof typeof ICONS
export function Icon({ name, size = 22 }: { name: IconName; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ICONS[name]} /></svg>
  )
}

/** ภาพเงาสีเดียว (ต้นฉบับของเรา) — ฟรีแลนซ์ทำงานที่โต๊ะใต้ต้นไม้ นกบินผ่าน · สีตาม currentColor */
export function Silhouette({ className = 'silhouette' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 520 220" fill="currentColor" aria-hidden="true">
      {/* นก */}
      <path d="M40 60c8-6 14-6 20 0-6-1-12-1-20 0zM72 46c7-5 12-5 18 0-6-1-11-1-18 0zM110 58c7-5 12-5 18 0-6-1-11-1-18 0zM96 78c6-4 10-4 15 0-5-1-9-1-15 0zM140 40c6-4 10-4 15 0-5-1-9-1-15 0zM170 52c5-3 8-3 12 0-4-1-7-1-12 0z" />
      {/* ต้นไม้ */}
      <path d="M400 200c-3-40-4-80-2-120-20 10-40 4-52-14 14 4 26 0 34-10-24-4-36-20-34-42 10 16 24 24 42 22-4-14 2-26 14-34 4 12 14 20 26 22 14-10 30-8 44 2-14 8-20 20-16 34 20-6 36 0 46 14-18-2-34 4-46 16 14 6 24 18 26 34-16-8-30-8-42 2 2 26 0 50-4 74z" />
      {/* โต๊ะ + คน */}
      <path d="M250 200v-6h-8v-38h72v38h-8v6h-8v-6h-40v6zM246 148h80v8h-80z" />
      <path d="M304 120a12 12 0 1 1 24 0 12 12 0 1 1-24 0zM300 140c2-10 10-14 18-14s16 4 18 14v26h-8v34h-8v-30h-4v30h-8v-34h-8z" />
      {/* พื้น */}
      <path d="M0 208c60-4 120 2 180-2s120-4 180 0 120 2 160-2v14H0z" />
    </svg>
  )
}

/** ทางกลับของหน้าย่อย — บอกชัดว่ากลับไปไหน ไม่ใช่ "back" ลอยๆ */
export function BackLink({ to, label }: { to: string; label: string }) {
  return <Link className="backbtn" to={to} aria-label={`${copy.common.back}ไป${label}`}>‹ {label}</Link>
}
