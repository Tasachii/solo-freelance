import { INCOME_HISTORY, MONTH } from '../data.js'
import { baht, totals, expenseTotal, netMonth, needsAttention, initialOf } from '../state.js'
import { EmptyState } from './Field.jsx'

function Sparkline({ points }) {
  const max = Math.max(...points, 1)
  const min = Math.min(...points, 0)
  const span = max - min || 1
  const w = 100
  const h = 32
  const step = points.length > 1 ? w / (points.length - 1) : w
  const xy = points.map((v, i) => [i * step, h - ((v - min) / span) * h])
  const line = xy.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `0,${h} ${line} ${w},${h}`
  const last = xy[xy.length - 1]

  return (
    <svg className="spark" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polygon points={area} fill="currentColor" opacity=".1" />
      <polyline points={line} fill="none" stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
      <circle cx={last[0]} cy={last[1]} r="2.6" fill="currentColor" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

export default function OverviewTab({ state, onAddExpense, onEditExpense, onOpenStudent, desk }) {
  const { total, paid, outstanding } = totals(state)
  const spent = expenseTotal(state)
  const net = netMonth(state)
  const watch = needsAttention(state)

  const lastMonth = INCOME_HISTORY[INCOME_HISTORY.length - 1].amount
  const diff = total - lastMonth
  const pct = lastMonth > 0 ? Math.round((diff / lastMonth) * 100) : 0
  const series = [...INCOME_HISTORY.map((m) => m.amount), total]
  const labels = [...INCOME_HISTORY.map((m) => m.month), 'ก.ย.']

  const trendCard = (
    <div className="card trend rise">
      <div className="trend__head">
        <div>
          <div className="money__k">เทียบกับเดือนที่แล้ว</div>
          <div className={`trend__v ${diff >= 0 ? 'is-up' : 'is-down'}`}>
            {diff >= 0 ? '▲' : '▼'} {baht(Math.abs(diff))}
            <small>บาท ({diff >= 0 ? '+' : '−'}{Math.abs(pct)}%)</small>
          </div>
        </div>
        <div className="trend__prev">
          {INCOME_HISTORY[INCOME_HISTORY.length - 1].month}
          <b>{baht(lastMonth)}</b>
        </div>
      </div>
      <div className={`trend__chart ${diff >= 0 ? 'is-up' : 'is-down'}`}>
        <Sparkline points={series} />
      </div>
      <div className="trend__axis">
        {labels.map((m, i) => (
          <span key={m} className={i === labels.length - 1 ? 'is-now' : ''}>{m}</span>
        ))}
      </div>
    </div>
  )

  const netCard = (
    <div className="card money rise d2">
      <div className="money__k">เหลือจริงเดือนนี้ (เงินที่เข้าบัญชีแล้ว ลบรายจ่าย)</div>
      <div className="money__v" style={{ color: net >= 0 ? 'var(--ok)' : 'var(--bad)' }}>
        {baht(net)}<small>บาท</small>
      </div>
      <div className="money__split">
        <div className="money__cell money__cell--in">
          <span>เข้าบัญชีแล้ว</span><b>{baht(paid)}</b>
        </div>
        <div className="money__cell money__cell--out">
          <span>รายจ่าย</span><b>−{baht(spent)}</b>
        </div>
      </div>
      <p className="hint" style={{ marginLeft: 0, marginRight: 0 }}>
        <span className="hint__ico">ⓘ</span>
        <span>ยังไม่นับ <b>{baht(outstanding)} บาท</b> ที่ผู้ปกครองยังไม่โอน</span>
      </p>
    </div>
  )

  const expenseCard = (
    <div className="card rise d3">
      <div className="listhead">
        <h3>รายจ่ายเดือนนี้</h3>
        <button className="btn btn--ghost btn--sm" onClick={onAddExpense}>+ บันทึก</button>
      </div>
      {state.expenses.length === 0 ? (
        <EmptyState icon="🧾" title="ยังไม่มีรายจ่าย"
          desc="ค่าเดินทาง ค่าปริ้นชีท ค่าเช่าห้อง — บันทึกไว้จะเห็นว่าเหลือจริงเท่าไหร่" />
      ) : (
        state.expenses.map((e) => (
          <button className="exp" key={e.id} onClick={() => onEditExpense(e)}>
            <span className="exp__cat">{e.category}</span>
            <span className="exp__main">
              <span className="exp__note">{e.note || e.category}</span>
              <span className="exp__date">{e.date}</span>
            </span>
            <span className="exp__amt">−{baht(e.amount)}</span>
          </button>
        ))
      )}
    </div>
  )

  const watchCard = (
    <div className="card rise d4">
      <div className="listhead">
        <h3>ต้องดู</h3>
        <span className="listhead__n">{watch.length}</span>
      </div>
      {watch.length === 0 ? (
        <EmptyState icon="✓" title="ไม่มีอะไรค้าง" desc="ทุกคนจ่ายครบและเรียนตามแผน" />
      ) : (
        watch.map(({ student, why, tone }) => (
          <button className="watch" key={student.id} onClick={() => onOpenStudent(student)}>
            <span className={`av av--${tone === 'bad' ? 'overdue' : 'pending'}`}>{initialOf(student.nick)}</span>
            <span className="watch__main">
              <span className="stu__name">{student.nick}</span>
              <span className={`watch__why watch__why--${tone}`}>{why}</span>
            </span>
            <span className="watch__go" aria-hidden="true">›</span>
          </button>
        ))
      )}
    </div>
  )

  const totalCard = (
    <div className="card money rise">
      <div className="money__k">ค่าเรียนเดือน{MONTH}</div>
      <div className="money__v">{baht(total)}<small>บาท</small></div>
      <div className="money__bar" aria-hidden="true">
        <i style={{ width: `${total > 0 ? (paid / total) * 100 : 0}%` }} />
      </div>
      <div className="money__split">
        <div className="money__cell money__cell--in"><span>เข้าแล้ว</span><b>{baht(paid)}</b></div>
        <div className="money__cell money__cell--out"><span>ค้าง</span><b>{baht(outstanding)}</b></div>
      </div>
    </div>
  )

  if (desk) {
    return (
      <>
        <p className="desk__meta">ภาพรวมเดือน{MONTH} · ข้อมูลคำนวณสดจากการเช็คชื่อและการรับยอด</p>
        <div className="desk__cols">
          <div className="stack">{trendCard}{expenseCard}</div>
          <div className="stack">{netCard}{watchCard}</div>
        </div>
      </>
    )
  }

  return (
    <div className="pane">
      {totalCard}
      {trendCard}
      {netCard}
      {watchCard}
      {expenseCard}
    </div>
  )
}
