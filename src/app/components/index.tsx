import { useEffect, useRef, type ReactNode } from 'react'
import { copy } from '../../copy'

export function DemoBadge() {
  return <span className="demo-badge">{copy.demoBadge}</span>
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

export function ProgressBar({ value, max, tone }: { value: number; max: number; tone: 'ok' | 'warn' | 'danger' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <span className={`bar bar--${tone}`} aria-hidden="true"><i style={{ width: `${pct}%` }} /></span>
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

export function BottomSheet(
  { title, sub, onClose, footer, children }:
  { title: string; sub?: string; onClose: () => void; footer?: ReactNode; children: ReactNode },
) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    ref.current?.querySelector<HTMLElement>('input,select,textarea,button')?.focus()
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <>
      <div className="veil" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} ref={ref}>
        <div className="sheet__grip" />
        <div className="sheet__hd">
          <div>
            <h3 className="sheet__t">{title}</h3>
            {sub && <p className="sheet__s">{sub}</p>}
          </div>
          <button className="sheet__x" onClick={onClose} aria-label={copy.common.close}>✕</button>
        </div>
        <div className="sheet__body">{children}</div>
        {footer && <div className="sheet__foot">{footer}</div>}
      </div>
    </>
  )
}
