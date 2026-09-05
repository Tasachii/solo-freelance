import { useState } from 'react'
import { Link } from 'react-router-dom'
import { professions } from '../professions'
import { copy } from '../copy'
import { DemoBadge } from '../app/components'
import WaitlistSheet from './WaitlistSheet'

/**
 * หน้าแรกเป็นของคนที่จะใช้แอปจริง ไม่ใช่ของคนที่มาตัดสิน
 * ข้อมูลเชิงสถาปัตยกรรม (ตาราง Engine, ทำไมเริ่มที่อาชีพนี้) ย้ายไปหน้า /pitch แล้ว
 */
export default function Landing() {
  const [lead, setLead] = useState<string | null>(null)
  const soon = professions.filter((p) => p.status !== 'live')

  return (
    <div className="land">
      <header className="land__hero">
        <div className="land__bar">
          <b className="land__brand">{copy.brand.name}</b>
          <DemoBadge />
        </div>
        <h1 className="land__h1">{copy.landing.h1}</h1>
        <p className="land__sub">{copy.landing.sub}</p>
        <div className="land__cta">
          <Link className="btn btn--primary" to="/app/today">{copy.landing.ctaPrimary}</Link>
          <Link className="btn btn--ghost" to="/pricing">{copy.landing.ctaSecondary}</Link>
        </div>
        <p className="land__money">{copy.landing.moneyLine}</p>
      </header>

      <section className="land__sec" aria-labelledby="sec-admin">
        <h2 className="land__h2" id="sec-admin">{copy.landing.adminTitle}</h2>
        <ol className="land__steps">
          {copy.landing.adminSteps.map((s, i) => (
            <li key={s.h}>
              <span className="land__num num" aria-hidden="true">{i + 1}</span>
              <div><b>{s.h}</b><span>{s.p}</span></div>
            </li>
          ))}
        </ol>
      </section>

      <section className="land__sec land__sec--cta">
        <p className="land__last">{copy.landing.ctaBottom}</p>
        <Link className="btn btn--primary" to="/app/today">{copy.landing.tryNow}</Link>
      </section>

      {/* อาชีพอื่นยังเปิดไม่ได้ จึงไม่ใช่ "ตัวเลือก" — บอกให้รู้ว่ากำลังมา ก็พอ */}
      <p className="soonline">
        <span className="soonline__l">{copy.landing.comingSoon}</span>
        {soon.map((p) => (
          <span key={p.id} className="soonline__i">
            <span aria-hidden="true">{p.icon}</span> {p.name}
          </span>
        ))}
        <button className="soonline__b" onClick={() => setLead(soon[0]?.id)}>
          {copy.landing.notifyMe}
        </button>
      </p>

      <footer className="land__foot">
        <span>{copy.brand.name} · {copy.brand.tagline}</span>
        <span>{copy.landing.footerTeam}</span>
        <Link to="/pricing">{copy.pricing.title}</Link>
      </footer>

      {lead !== null && (
        <WaitlistSheet preselect={lead || undefined} onClose={() => setLead(null)} />
      )}
    </div>
  )
}
