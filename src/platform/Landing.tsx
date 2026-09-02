import { useState } from 'react'
import { Link } from 'react-router-dom'
import { professions } from '../professions'
import { copy } from '../copy'
import { DemoBadge } from '../app/components'
import ProfessionPicker from './ProfessionPicker'
import WaitlistSheet from './WaitlistSheet'

const modeLabel = (m?: string): string =>
  (m && copy.waitlist.modeLabels[m as keyof typeof copy.waitlist.modeLabels]) || '—'

/** ตารางสร้างจาก vocab จริงของแต่ละอาชีพ — ไม่ได้พิมพ์ค่าซ้ำไว้ */
function EngineTable() {
  const cell = (p: (typeof professions)[number], row: number): string => {
    const v = p.vocab
    return [v.client, v.subject, v.unit, v.completionDone, modeLabel(p.defaultBilling)][row]
  }
  return (
    <div className="tblwrap">
      <table className="engine">
        <caption className="engine__cap">{copy.landing.engineCaption}</caption>
        <thead>
          <tr>
            <th scope="col" />
            {professions.map((p) => (
              <th key={p.id} scope="col">
                <span aria-hidden="true">{p.icon}</span> {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {copy.landing.engineRows.map((label, i) => (
            <tr key={label}>
              <th scope="row">{label}</th>
              {professions.map((p) => <td key={p.id}>{cell(p, i)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function Landing() {
  const [lead, setLead] = useState<string | null>(null)

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

      <section className="land__sec" aria-labelledby="sec-pick">
        <h2 className="land__h2" id="sec-pick">{copy.landing.pickerTitle}</h2>
        <ProfessionPicker onNotify={setLead} />
      </section>

      <section className="land__sec" aria-labelledby="sec-why">
        <h2 className="land__h2" id="sec-why">{copy.landing.whyTitle}</h2>
        <ul className="land__why">
          {copy.landing.why.map((w) => (
            <li key={w.h}><b>{w.h}</b><span>{w.p}</span></li>
          ))}
        </ul>
      </section>

      <section className="land__sec" aria-labelledby="sec-engine">
        <h2 className="land__h2" id="sec-engine">{copy.landing.engineTitle}</h2>
        <EngineTable />
      </section>

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
        <Link className="btn btn--ghost land__pitchlink" to="/pitch">{copy.pitch.steps[0].t} → {copy.pitch.steps[6].t}</Link>
      </section>

      <section className="land__sec land__sec--cta">
        <p className="land__last">{copy.landing.ctaBottom}</p>
        <button className="btn btn--primary" onClick={() => setLead('')}>{copy.waitlist.title}</button>
      </section>

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
