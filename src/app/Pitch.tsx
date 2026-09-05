import { useState } from 'react'
import { Link } from 'react-router-dom'
import { copy } from '../copy'
import { DemoBadge } from './components'
import EngineTable from '../platform/EngineTable'

/** ปลายทางในแอปของแต่ละจังหวะ — ให้กดเข้าไปดูของจริงได้ ไม่ใช่ภาพนิ่ง */
const TARGETS = [
  '/app/today', '/app/billing', '/app/admin', '/app/billing',
  '/app/receipts', '/app/admin', '/app/billing',
]

export default function Pitch() {
  const [i, setI] = useState(0)
  const steps = copy.pitch.steps
  const last = i === steps.length - 1

  return (
    <div className="land">
      <header className="land__hero land__hero--sm">
        <div className="land__bar">
          <Link className="backlink" to="/">‹ {copy.brand.name}</Link>
          <DemoBadge />
        </div>
        <h1 className="land__h1">{steps[i].t}</h1>
        <p className="land__sub">{steps[i].s}</p>
      </header>

      <section className="land__sec">
        <ol className="pitch__dots" aria-label={`${i + 1} / ${steps.length}`}>
          {steps.map((s, n) => (
            <li key={s.t}>
              <button className={`pitch__dot${n === i ? ' pitch__dot--on' : ''}`}
                aria-current={n === i ? 'step' : undefined}
                aria-label={s.t} onClick={() => setI(n)} />
            </li>
          ))}
        </ol>

        <ol className="pitch__list">
          {steps.map((s, n) => (
            <li key={s.t} className={n === i ? 'is-on' : undefined}>
              <span className="pitch__n num" aria-hidden="true">{n + 1}</span>
              <div><b>{s.t}</b><span>{s.s}</span></div>
            </li>
          ))}
        </ol>

        <div className="btnrow">
          <Link className="btn btn--primary" to={TARGETS[i]}>{copy.landing.tryNow}</Link>
          {last ? (
            <button className="btn btn--ghost" onClick={() => setI(0)}>{copy.pitch.restart}</button>
          ) : (
            <button className="btn btn--ghost" onClick={() => setI(i + 1)}>{copy.pitch.next}</button>
          )}
        </div>
      </section>

      <section className="land__sec" aria-labelledby="sec-engine">
        <h2 className="land__h2" id="sec-engine">{copy.landing.engineTitle}</h2>
        <EngineTable />
      </section>

      <footer className="land__foot">
        <Link to="/">{copy.brand.name}</Link>
        <Link to="/pricing">{copy.pricing.title}</Link>
      </footer>
    </div>
  )
}
