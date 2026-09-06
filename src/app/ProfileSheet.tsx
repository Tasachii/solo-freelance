import { useState } from 'react'
import { useStore } from '../core/store'
import { copy } from '../copy'
import type { Particle } from '../core/types'
import { PARTICLES } from '../core/particle'
import { isPaymentDestination, normalizePaymentDestination } from '../core/paymentDestination'
import { BottomSheet } from './components'
import { useToast } from './components/Toast'

/**
 * แก้ชื่อ · พร้อมเพย์ · คำลงท้าย หลัง onboarding — พิมพ์เลขบัญชีผิดตัวเดียว
 * ต้องแก้ได้โดยไม่ต้องล้างข้อมูลทั้งหมด ร่างที่รอส่งจะถูก render ใหม่เอง
 */
export function ProfileSheet({ onClose }: { onClose: () => void }) {
  const { state, dispatch } = useStore()
  const toast = useToast()
  const [name, setName] = useState(state.provider.name)
  const [pp, setPp] = useState(state.provider.promptpayId)
  const [particle, setParticle] = useState<Particle>(state.provider.particle ?? 'ครับ')
  const [ppError, setPpError] = useState(false)
  const ppOk = pp.trim() === '' || isPaymentDestination(pp)
  const nameOk = name.trim().length > 0

  const save = () => {
    if (!ppOk) { setPpError(true); return }
    if (!nameOk) return
    const ok = dispatch({ type: 'setProvider', name: name.trim(), promptpayId: normalizePaymentDestination(pp) ?? '', particle })
    if (!ok) { toast.push({ text: copy.common.saveFailed, tone: 'danger' }); return }
    toast.push({ text: copy.menu.profileSaved, tone: 'ok' })
    onClose()
  }

  return (
    <BottomSheet title={copy.menu.profile} onClose={onClose}
      footer={<button className="btn btn--primary btn--block" disabled={!nameOk} onClick={save}>{copy.common.save}</button>}>
      <label className="fld">
        <span className="fld__l">{copy.onboarding.providerName}</span>
        <input className="inp" value={name} onChange={(e) => setName(e.target.value)} />
        <span className="hint">{copy.onboarding.nameHint}</span>
      </label>
      <div className="fld" role="group" aria-label={copy.onboarding.particle}>
        <span className="fld__l">{copy.onboarding.particle}</span>
        <div className="chips">
          {PARTICLES.map((pt) => (
            <button key={pt} type="button" className={`chip${particle === pt ? ' chip--on' : ''}`} aria-pressed={particle === pt}
              onClick={() => setParticle(pt)}>{pt}</button>
          ))}
        </div>
        <span className="hint">{copy.onboarding.particleHint.replace('{p}', particle)}</span>
      </div>
      <label className="fld">
        <span className="fld__l">{copy.onboarding.promptpay}</span>
        <input className="inp" inputMode="numeric" value={pp} aria-invalid={ppError || undefined}
          onChange={(e) => { setPp(e.target.value); setPpError(false) }} />
        {ppError
          ? <span className="fld__err">ใส่เบอร์มือถือไทย 10 หลัก หรือเลขบัตรประชาชน 13 หลักที่ถูกต้อง</span>
          : <span className="hint">{copy.onboarding.promptpayHint}</span>}
      </label>
    </BottomSheet>
  )
}
