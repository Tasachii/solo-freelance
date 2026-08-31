import { SESSIONS, STUDENTS, RATES, TYPE_LABEL } from '../data.js'
import { baht } from '../state.js'

const student = (id) => STUDENTS.find((s) => s.id === id)

/** จัดคาบเวลาเดียวกันให้อยู่บล็อกเดียวกัน (คาบกลุ่มมีหลายคนพร้อมกัน) */
function byTime(list) {
  const out = []
  for (const s of list) {
    const last = out[out.length - 1]
    if (last && last.time === s.time) last.items.push(s)
    else out.push({ time: s.time, items: [s] })
  }
  return out
}

export default function TodayTab({ state, onCheckIn, onLeave, desk }) {
  const blocks = byTime([...SESSIONS].sort((a, b) => a.time.localeCompare(b.time)))
  const done = SESSIONS.filter((c) => state.sessions[c.id] === 'attended').length
  const left = SESSIONS.filter((c) => state.sessions[c.id] === 'todo').length
  const away = SESSIONS.filter((c) => state.sessions[c.id] === 'leave').length

  const list = (
    <div className="card rise">
      {blocks.map((block) => (
        <div className="tblock" key={block.time}>
          {block.items.length > 1 && <div className="groupmark">คาบกลุ่ม · {block.items.length} คน</div>}
          {block.items.map((c, i) => {
            const st = student(c.studentId)
            const status = state.sessions[c.id]
            return (
              <div
                className={`slot${status === 'attended' ? ' slot--done' : ''}${status === 'leave' ? ' slot--leave' : ''}`}
                key={c.id}
              >
                <div className="slot__time">{i === 0 ? c.time : ''}</div>
                <div className="slot__main">
                  <div className="slot__name">{st.nick}</div>
                  <div className="slot__meta">
                    {c.subject} {c.grade} · {TYPE_LABEL[c.type]} {baht(RATES[c.type])} บ.
                  </div>
                </div>
                <div className="slot__act">
                  {status === 'todo' && (
                    <>
                      <button className="btn btn--ink btn--sm" onClick={() => onCheckIn(c)}>
                        เช็คชื่อ
                      </button>
                      <button className="slot__skip" onClick={() => onLeave(c)}>
                        นักเรียนลา
                      </button>
                    </>
                  )}
                  {status === 'attended' && <span className="pill pill--paid">✓ มาเรียน</span>}
                  {status === 'leave' && <span className="pill pill--leave">ลา · นัดชดเชย</span>}
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )

  if (desk) {
    return (
      <div className="desk__cols">
        <div>{list}</div>
        <aside className="card side-card rise d2">
          <h3>สรุปวันนี้</h3>
          <div className="kv"><span>คาบทั้งหมด</span><b>{SESSIONS.length}</b></div>
          <div className="kv"><span>เช็คชื่อแล้ว</span><b>{done}</b></div>
          <div className="kv"><span>ลา · นัดชดเชย</span><b>{away}</b></div>
          <div className="kv"><span>ยังไม่ได้เช็ค</span><b style={{ color: left ? 'var(--cta)' : 'inherit' }}>{left}</b></div>
          <p className="hint" style={{ marginLeft: 0 }}>
            <span className="hint__ico">⚠︎</span>
            <span><b>ลืมเช็คชื่อ 1 ครั้ง = สอนฟรี 400 บาท</b></span>
          </p>
        </aside>
      </div>
    )
  }

  return (
    <div className="pane">
      <div className="sect">
        <h2>คาบสอนวันนี้</h2>
        <span>เช็คชื่อแล้ว {done}/{SESSIONS.length} คาบ</span>
      </div>
      {list}
      <p className="hint">
        <span className="hint__ico">⚠︎</span>
        <span><b>ลืมเช็คชื่อ 1 ครั้ง = สอนฟรี 400 บาท</b></span>
      </p>
    </div>
  )
}
