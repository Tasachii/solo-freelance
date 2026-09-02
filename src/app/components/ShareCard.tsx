import { useEffect, useRef } from 'react'
import { BottomSheet } from './index'
import { copy } from '../../copy'
import { useStore } from '../../core/store'
import { money, periodThaiFull } from '../../core/format'

/** การ์ดแชร์ 1080×1080 — ไม่มีชื่อลูกค้าหรือผู้รับบริการบนการ์ด */
export default function ShareCard({ period, recovered, onClose }: { period: string; recovered: number; onClose: () => void }) {
  const { state } = useStore()
  const ref = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = ref.current
    if (!c) return
    const g = c.getContext('2d')
    if (!g) return
    const css = getComputedStyle(document.documentElement)
    const brand = css.getPropertyValue('--brand').trim() || '#0f6f66'
    const ink = css.getPropertyValue('--ink').trim() || '#1f2a2e'
    const surface = css.getPropertyValue('--surface').trim() || '#fff'
    const muted = css.getPropertyValue('--muted').trim() || '#6f6a62'

    g.fillStyle = surface; g.fillRect(0, 0, 1080, 1080)
    g.fillStyle = brand; g.fillRect(0, 0, 1080, 16)
    g.fillStyle = ink
    g.font = '600 44px Anuphan, system-ui, sans-serif'
    g.fillText(`เดือน${periodThaiFull(period)}`, 88, 300)
    g.font = '700 68px Anuphan, system-ui, sans-serif'
    g.fillText(`${copy.brand.name} ช่วย${state.provider.name}ไว้`, 88, 400)
    g.fillStyle = brand
    g.font = '700 180px Anuphan, system-ui, sans-serif'
    g.fillText(`${money(recovered)}`, 88, 600)
    g.fillStyle = ink
    g.font = '600 56px Anuphan, system-ui, sans-serif'
    g.fillText(copy.common.baht, 88, 680)
    g.fillStyle = muted
    g.font = '400 36px Anuphan, system-ui, sans-serif'
    g.fillText(`${copy.brand.name} — ${copy.brand.tagline}`, 88, 960)
  }, [period, recovered, state.provider.name])

  const save = () => {
    const url = ref.current?.toDataURL('image/png')
    if (!url) return
    const a = document.createElement('a')
    a.href = url; a.download = `solo-${period}.png`
    document.body.appendChild(a); a.click(); a.remove()
  }

  return (
    <BottomSheet title={copy.billing.share} onClose={onClose}
      footer={<button className="btn btn--primary btn--block" onClick={save}>ดาวน์โหลด PNG</button>}>
      <canvas ref={ref} width={1080} height={1080} className="sharecanvas" aria-label={copy.billing.share} />
    </BottomSheet>
  )
}
