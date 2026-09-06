import { Link, useNavigate } from 'react-router-dom'
import { useStore } from '../core/store'
import { professionById, fillVocab } from '../professions'
import { copy } from '../copy'
import { STYLES, scenarioForStyle } from '../core/style'
import type { WorkStyle } from '../core/types'
import { DemoBadge } from '../app/components'

/**
 * หน้าแรกก่อนเข้าใช้ — เลือกว่าเก็บเงินแบบไหน แตะเดียวเข้าแอป
 * เดโม: สลับชุดข้อมูลให้ตรงแบบ · ใช้จริง: เปลี่ยนแค่ค่าเริ่มต้นและตัวกรอง ข้อมูลอยู่ครบ
 * คำศัพท์ (ครั้ง/คาบ/ลูกค้า) มาจากอาชีพ — หน้านี้ไม่รู้ว่าผู้ใช้เป็นครู
 */
export default function StylePicker() {
  const { state, dispatch, resetDemo, track } = useStore()
  const nav = useNavigate()
  const v = professionById(state.professionId).vocab
  const real = state.mode === 'real'
  const fill = (t: string) => fillVocab(t, v)

  const pick = (style: WorkStyle) => {
    if (real) dispatch({ type: 'setStyle', style })
    else resetDemo(scenarioForStyle[style])
    track(`style_${style}`)
    nav('/app/today')
  }

  return (
    <div className="land start">
      <header className="land__top">
        <Link className="land__brand land__brand--link" to="/">‹ {copy.brand.name}</Link>
        {!real && <DemoBadge />}
      </header>
      <h1 className="land__h1">{copy.start.title}</h1>
      <p className="land__sub">{real ? copy.start.realNote : copy.start.sub}</p>

      <div className="picks">
        {STYLES.map((st) => {
          const c = copy.start.cards[st]
          const on = state.style === st
          return (
            <button key={st} type="button" className={`pick${on ? ' pick--on' : ''}`} aria-pressed={on} onClick={() => pick(st)}>
              <span className="pick__t">{c.t}{on && <i className="pick__now">{copy.start.current}</i>}</span>
              <span className="pick__s">{fill(c.s)}</span>
              <ul className="pick__b">{c.b.map((b) => <li key={b}>{fill(b)}</li>)}</ul>
              <span className="pick__go">{copy.start.pick} ›</span>
            </button>
          )
        })}
      </div>
      <p className="hint start__note">{copy.start.placeNote}</p>
    </div>
  )
}
