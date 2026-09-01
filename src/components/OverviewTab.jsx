import { baht, totals, expenseTotal, netMonth, needsAttention, incomeSeries, initialOf, expensesIn } from '../state.js'
import { longMonth, shortMonth, shortDate } from '../dates.js'

function Spark({ points }) {
  // ใช้ช่วงค่าจริง ไม่บังคับให้เริ่มที่ 0 ไม่งั้นเส้นแบนจนดูทิศทางไม่ออก
  const hi = Math.max(...points)
  const lo = Math.min(...points)
  const pad = (hi - lo) * 0.28 || Math.max(hi * 0.1, 1)
  const max = hi + pad
  const min = Math.max(0, lo - pad)
  const span = max - min || 1
  const w = 100, h = 34
  const step = points.length > 1 ? w / (points.length - 1) : w
  const xy = points.map((v, i) => [i * step, h - ((v - min) / span) * h])
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const last = xy[xy.length - 1]
  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.8" fill="currentColor" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export default function OverviewTab({ state, period, onOpenStudent, onAddExpense, onEditExpense }) {
  const { total, paid, outstanding } = totals(state, period)
  const spent = expenseTotal(state, period)
  const net = netMonth(state, period)
  const watch = needsAttention(state, period)
  const months = incomeSeries(state, period)
  const prev = months[months.length - 2]?.amount ?? 0
  const diff = total - prev
  const pct = prev > 0 ? Math.round((diff / prev) * 100) : 0
  const expenses = expensesIn(state, period)

  return (
    <div className="home">
      <section className="home__money">
        <b style={{ color: net >= 0 ? 'var(--ok)' : 'var(--bad)' }}>{baht(net)}</b>
        <span>เหลือจริงเดือน{longMonth(period)}</span>
        <div className="split2">
          <span><i className="dot dot--ok" />เข้าแล้ว {baht(paid)}</span>
          <span><i className="dot dot--bad" />รายจ่าย {baht(spent)}</span>
        </div>
      </section>

      <section className="home__sec">
        <h2 className="home__lbl">รายรับ 6 เดือน</h2>
        <div className={`trendline ${diff >= 0 ? 'is-up' : 'is-down'}`}>
          <Spark points={months.map((m) => m.amount)} />
        </div>
        <div className="trendaxis">
          {months.map((m, i) => (
            <span key={m.period} className={i === months.length - 1 ? 'is-now' : ''}>{shortMonth(m.period)}</span>
          ))}
        </div>
        <p className="home__saved" style={{ marginTop: 12 }}>
          เดือนนี้ {baht(total)} · เทียบเดือนที่แล้ว{' '}
          <b style={{ color: diff >= 0 ? 'var(--ok)' : 'var(--bad)' }}>
            {diff >= 0 ? '+' : '−'}{baht(Math.abs(diff))} ({diff >= 0 ? '+' : '−'}{Math.abs(pct)}%)
          </b>
        </p>
      </section>

      <section className="home__sec">
        <h2 className="home__lbl">ต้องดู</h2>
        {watch.length === 0 ? (
          <p className="home__quiet">ทุกคนจ่ายครบและเรียนตามแผน</p>
        ) : (
          <ul className="rows2">
            {watch.map(({ student, why, tone }) => (
              <li className="row2" key={student.id}>
                <button className="row2__person" onClick={() => onOpenStudent(student)}>
                  <span className={`av av--${tone === 'bad' ? 'overdue' : 'pending'}`}>{initialOf(student.nick)}</span>
                  <span className="row2__main">
                    <span className="row2__n">{student.nick}</span>
                    <span className={`row2__why watch__why--${tone}`}>{why}</span>
                  </span>
                  <span className="watch__go" aria-hidden="true">›</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="home__sec">
        <h2 className="home__lbl">รายจ่าย {baht(spent)} บาท</h2>
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

      <p className="home__quiet" style={{ fontSize: 12.5 }}>
        ค้างเก็บอยู่ {baht(outstanding)} บาท · ยังไม่นับรวมในเงินเหลือจริง
      </p>
    </div>
  )
}
