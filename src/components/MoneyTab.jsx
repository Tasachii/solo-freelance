import { useState } from 'react'
import { STATUS_LABEL } from '../data.js'
import { baht, billOf, totals } from '../state.js'
import { longMonth } from '../dates.js'
import { EmptyState } from './Field.jsx'

export default function MoneyTab({ state, period, onSlip, onRemind, onUndoPaid, onSendAll }) {
  const [showAll, setShowAll] = useState(false)
  const { total, paid, outstanding } = totals(state, period)

  const unpaid = state.students.filter((s) => billOf(s, state, period).status !== 'paid')
  const shown = showAll ? state.students : unpaid

  if (state.students.length === 0) {
    return <EmptyState icon="🧾" title="ยังไม่มีบิล" desc="เพิ่มนักเรียนแล้วระบบจะออกบิลให้เอง" />
  }

  return (
    <div className="home">
      <section className="home__money">
        <b style={{ color: 'var(--text)' }}>{baht(total)}</b>
        <span>ค่าเรียนเดือน{longMonth(period)}</span>
        <div className="split2">
          <span><i className="dot dot--ok" />เข้าแล้ว {baht(paid)}</span>
          <span><i className="dot dot--bad" />ค้าง {baht(outstanding)}</span>
        </div>
      </section>

      <section className="home__sec">
        <h2 className="home__lbl">{showAll ? 'ทุกคน' : `ยังไม่จ่าย ${unpaid.length} คน`}</h2>
        {shown.length === 0 ? (
          <p className="home__quiet">เก็บครบทุกคนแล้ว</p>
        ) : (
          <ul className="rows2">
            {shown.map((s) => {
              const { times, amount, status } = billOf(s, state, period)
              return (
                <li className="row2" key={s.id}>
                  <span className="row2__main">
                    <span className="row2__n">{s.nick}</span>
                    <span className="row2__why">{times} ครั้ง · {baht(amount)} บาท</span>
                  </span>
                  {status === 'paid' && <button className="row2__done" onClick={() => onUndoPaid(s)}>จ่ายแล้ว</button>}
                  {status === 'pending' && <button className="btn btn--ghost btn--sm" onClick={() => onSlip(s)}>ดูสลิป</button>}
                  {status === 'overdue' && <button className="btn btn--cta btn--sm" onClick={() => onRemind(s)}>ทวง</button>}
                  {status === 'none' && <span className="row2__why">—</span>}
                </li>
              )
            })}
          </ul>
        )}
        <button className="home__more" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'ดูเฉพาะที่ยังไม่จ่าย' : 'ดูทุกคน'}
        </button>
      </section>

      <section className="home__sec">
        <button className="btn btn--cta btn--block" onClick={onSendAll}>ส่งบิลเข้า LINE ทุกคน</button>
      </section>

    </div>
  )
}
