import { SESSIONS, STUDENTS, RATES, TYPE_LABEL } from '../data.js'
import { baht } from '../state.js'

const student = (id) => STUDENTS.find((s) => s.id === id)

/** จัดคาบที่เวลาเดียวกันให้อยู่บล็อกเดียวกัน (คาบกลุ่มมีหลายคนในเวลาเดียว) */
function byTime(list) {
  const out = []
  for (const s of list) {
    const last = out[out.length - 1]
    if (last && last.time === s.time) last.items.push(s)
    else out.push({ time: s.time, items: [s] })
  }
  return out
}

export default function TodayTab({ state, onCheckIn, onLeave }) {
  const blocks = byTime([...SESSIONS].sort((a, b) => a.time.localeCompare(b.time)))
  const done = SESSIONS.filter((c) => state.sessions[c.id] === 'attended').length

  return (
    <div className="pane">
      <div className="sect">
        <h2>คาบสอนวันนี้</h2>
        <span>
          เช็คชื่อแล้ว {done}/{SESSIONS.length} คาบ
        </span>
      </div>

      <div className="card rise">
        {blocks.map((block) => (
          <div className="tblock" key={block.time}>
            {block.items.length > 1 && (
              <div className="groupmark">คาบกลุ่ม · {block.items.length} คน เรียนพร้อมกัน</div>
            )}
            {block.items.map((c, i) => {
              const st = student(c.studentId)
              const status = state.sessions[c.id]
              return (
                <div
                  className={`slot${status === 'attended' ? ' slot--done' : ''}${
                    status === 'leave' ? ' slot--leave' : ''
                  }`}
                  key={c.id}
                >
                  <div className="slot__time">{i === 0 ? c.time : ''}</div>

                  <div className="slot__main">
                    <div className="slot__name">{st.nick}</div>
                    <div className="slot__meta">
                      {c.subject} {c.grade} · <i>{TYPE_LABEL[c.type]}</i> {baht(RATES[c.type])} บ.
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

      <div className="hint rise d2">
        <span className="hint__ico">⚠︎</span>
        <span>
          <b>ลืมเช็คชื่อ 1 ครั้ง = สอนฟรี 400 บาท</b> — หน้านี้มีไว้กันเงินรั่ว
          ทุกครั้งที่แตะ ระบบจะนับเข้าบิลสิ้นเดือนให้ทันที
        </span>
      </div>

      <div className="hint rise d3">
        <span className="hint__ico">↺</span>
        <span>
          นักเรียนลาไม่ถูกนับเงิน ระบบเก็บไว้เป็น <b>คาบชดเชย</b> ให้อัตโนมัติ
          ผู้ปกครองจึงไม่รู้สึกว่าถูกคิดเงินเกิน
        </span>
      </div>

      <p className="disclaimer">เดโม · ข้อมูลสมมติทั้งหมด</p>
    </div>
  )
}
