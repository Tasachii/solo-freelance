import { STUDENTS, TYPE_LABEL } from '../data.js'
import { billOf, initialOf } from '../state.js'

const STATUS_LABEL = { paid: 'จ่ายแล้ว', pending: 'รอสลิป', overdue: 'ค้างจ่าย' }

export default function StudentsTab({ state, onOpen, desk }) {
  const taught = STUDENTS.reduce((n, s) => n + (state.attended[s.id] ?? 0), 0)

  const cards = STUDENTS.map((s, i) => {
    const { times, status } = billOf(s, state)
    const pct = Math.min(100, Math.round((times / s.plan) * 100))
    return (
      <button className={`card stu rise d${Math.min(i + 1, 6)}`} key={s.id} onClick={() => onOpen(s)}>
        <span className={`av av--${status}`}>{initialOf(s.nick)}</span>
        <span className="stu__main">
          <span className="stu__row1">
            <span className="stu__name">{s.nick}</span>
            <span className={`pill pill--${status}`}>{STATUS_LABEL[status]}</span>
          </span>
          <span className="stu__meta">
            {s.grade} · {s.subject} · {TYPE_LABEL[s.type]} · {s.parent}
          </span>
          <span className="stu__prog">
            <span className={`bar${times >= s.plan ? ' bar--full' : ''}`}>
              <i style={{ width: `${pct}%` }} />
            </span>
            <span className="stu__cnt">{times}/{s.plan} ครั้ง</span>
          </span>
        </span>
      </button>
    )
  })

  if (desk) {
    return (
      <>
        <p className="desk__meta">
          {STUDENTS.length} คน · เดือนนี้สอนแล้ว {taught} ครั้ง · แตะการ์ดเพื่อส่งสรุปให้ผู้ปกครอง
        </p>
        <div className="desk__grid3">{cards}</div>
      </>
    )
  }

  return (
    <div className="pane">
      <div className="card sum rise">
        <div>
          <div className="sum__k">นักเรียนที่ดูแลอยู่</div>
          <div className="sum__v">{STUDENTS.length} คน</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="sum__k">เดือนนี้สอนแล้ว</div>
          <div className="sum__v">{taught} ครั้ง</div>
        </div>
      </div>
      {cards}
      <p className="hint">
        <span className="hint__ico">♡</span>
        <span>แตะการ์ดเพื่อส่งสรุปพัฒนาการให้ผู้ปกครอง</span>
      </p>
    </div>
  )
}
