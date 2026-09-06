import { useState } from 'react'
import { Link } from 'react-router-dom'
import { copy } from '../copy'
import { money } from '../core/format'
import { DemoBadge, Icon } from '../app/components'
import WaitlistSheet from './WaitlistSheet'
import { AppearanceButton, ThemeToggle } from './ThemeToggle'

/** ตัวเลขราคาอยู่ที่นี่ ข้อความอยู่ใน copy — ดัชนีตรงกับ copy.pricing.plans */
const PRICES: (number | null)[] = [0, 299, 1500]
const HIGHLIGHT = 1
const CONCIERGE = 2
const QUARTERLY_PRICE = 850

export default function Pricing() {
  const [quarterly, setQuarterly] = useState(false)
  const [lead, setLead] = useState(false)

  const priceOf = (i: number): string => {
    const v = PRICES[i]
    if (v === null) return '—'
    if (v === 0) return copy.pricing.free
    if (i === HIGHLIGHT && quarterly) return `${money(QUARTERLY_PRICE)} ${copy.common.baht}`
    return `${money(v)} ${copy.common.baht}`
  }
  const unitOf = (i: number): string =>
    i === HIGHLIGHT && quarterly ? copy.pricing.perQuarter : copy.pricing.plans[i].unit

  return (
    <div className="land">
      <header className="land__hero land__hero--sm">
        <div className="land__bar">
          <Link className="backlink" to="/">‹ <span className="mark"><Icon name="spark" size={16} /></span>{copy.brand.name}</Link>
          <span className="land__tools"><DemoBadge /><ThemeToggle /><AppearanceButton /></span>
        </div>
        <h1 className="land__h1">{copy.pricing.title}</h1>
        <p className="land__sub">{copy.pricing.sub}</p>
      </header>

      <section className="land__sec">
        <label className="toggle">
          <input type="checkbox" checked={quarterly} onChange={(e) => setQuarterly(e.target.checked)} />
          <span>{copy.pricing.quarterly}</span>
        </label>

        <ul className="plans">
          {copy.pricing.plans.map((p, i) => (
            <li key={p.name} className={`plan${i === HIGHLIGHT ? ' plan--hi' : ''}`}>
              <b className="plan__name">{p.name}</b>
              <div className="plan__price">
                <span className="plan__amt num">{priceOf(i)}</span>
                <span className="plan__unit">{unitOf(i)}</span>
              </div>
              <p className="plan__desc">{p.desc}</p>
              <ul className="plan__feats">
                {p.features.map((f) => <li key={f}>{f}</li>)}
              </ul>
              {/* ทุกแพ็กเข้าไปลองได้เลย ไม่มีฟอร์มมาขวาง — มีแต่ Concierge ที่ต้องคุยกับทีมจริง */}
              {i === CONCIERGE ? (
                <button className="btn btn--ghost plan__cta" onClick={() => setLead(true)}>{p.cta}</button>
              ) : (
                <Link className={`btn plan__cta ${i === HIGHLIGHT ? 'btn--primary' : 'btn--ghost'}`}
                  to="/start">{p.cta}</Link>
              )}
            </li>
          ))}
        </ul>

        <ul className="land__notes">
          {copy.pricing.notes.map((n) => <li key={n}>{n}</li>)}
        </ul>
      </section>

      <section className="land__sec" aria-labelledby="sec-faq">
        <h2 className="land__h2" id="sec-faq">{copy.pricing.faqTitle}</h2>
        <ul className="qa">
          {copy.pricing.faq.map((f) => (
            <li key={f.q}>
              <details>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            </li>
          ))}
        </ul>
      </section>

      <footer className="land__foot">
        <Link to="/">{copy.brand.name}</Link>
        <span>{copy.landing.footerTeam}</span>
      </footer>

      {lead && <WaitlistSheet onClose={() => setLead(false)} />}
    </div>
  )
}
