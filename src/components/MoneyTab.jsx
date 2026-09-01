import { useState } from 'react'
import { STATUS_LABEL } from '../data.js'
import { baht, billOf, totals, expensesIn, expenseTotal, netMonth, incomeSeries } from '../state.js'
import { longMonth, shortMonth, shortDate } from '../dates.js'
import { EmptyState } from './Field.jsx'

function Spark({ points }) {
  const max = Math.max(...points, 1)
  const min = Math.min(...points, 0)
  const span = max - min || 1
  const w = 100, h = 30
  const step = points.length > 1 ? w / (points.length - 1) : w
  const xy = points.map((v, i) => [i * step, h - ((v - min) / span) * h])
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const last = xy[xy.length - 1]
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill="currentColor" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export default function MoneyTab({ state, period, onSlip, onRemind, onUndoPaid, onSendAll, onAddExpense, onEditExpense }) {
  const [showAll, setShowAll] = useState(false)
  const { total, paid, outstanding } = totals(state, period)
  const spent = expenseTotal(state, period)
  const net = netMonth(state, period)
  const months = incomeSeries(state, period)
  const prev = months[months.length - 2]?.amount ?? 0
  const diff = total - prev
  const expenses = expensesIn(state, period)

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

      <section className="home__sec">
        <h2 className="home__lbl">แนวโน้ม</h2>
        <div className={`trendline ${diff >= 0 ? 'is-up' : 'is-down'}`}>
          <Spark points={months.map((m) => m.amount)} />
        </div>
        <div className="trendaxis">
          {months.map((m, i) => (
            <span key={m.period} className={i === months.length - 1 ? 'is-now' : ''}>{shortMonth(m.period)}</span>
          ))}
        </div>
        <p className="home__saved" style={{ marginTop: 10 }}>
          เทียบเดือนที่แล้ว{' '}
          <b style={{ color: diff >= 0 ? 'var(--ok)' : 'var(--bad)' }}>
            {diff >= 0 ? '+' : '−'}{baht(Math.abs(diff))}
          </b>
        </p>
      </section>

      <section className="home__sec">
        <h2 className="home__lbl">รายจ่าย {baht(spent)} · เหลือจริง {baht(net)}</h2>
        {expenses.length === 0 ? (
          <p className="home__quiet">ยังไม่มีรายจ่ายเดือนนี้</p>
        ) : (
          <ul className="rows2">
            {expenses.map((e) => (
              <li className="row2" key={e.id}>
                <span className="row2__main">
                  <span className="row2__n">{e.note || e.category}</span>
                  <span className="row2__why">{e.category} · {shortDate(e.date)}</span>
                </span>
                <button className="row2__amt" onClick={() => onEditExpense(e)}>−{baht(e.amount)}</button>
              </li>
            ))}
          </ul>
        )}
        <button className="home__more" onClick={onAddExpense}>+ บันทึกรายจ่าย</button>
      </section>
    </div>
  )
}
