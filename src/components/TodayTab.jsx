import { TYPE_LABEL, TODAY } from '../data.js'
import { baht, rateOf, sessionsOn } from '../state.js'
import { EmptyState } from './Field.jsx'
import { TH_DAY } from '../dates.js'
import { weekday, shortDate } from '../dates.js'

function byTime(list) {
  const out = []
  for (const s of list) {
    const last = out[out.length - 1]
    if (last && last.time === s.time) last.items.push(s)
    else out.push({ time: s.time, items: [s] })
  }
  return out
}

export default function TodayTab({ state, onCheckIn, onLeave, onEditSession, onAddSession, desk }) {
  const sessions = sessionsOn(state, TODAY)
  const blocks = byTime(sessions)
  const find = (id) => state.students.find((s) => s.id === id)

  const done = sessions.filter((c) => state.sessionState[c.id] === 'attended').length
  const left = sessions.filter((c) => !state.sessionState[c.id] || state.sessionState[c.id] === 'todo').length
  const away = sessions.filter((c) => state.sessionState[c.id] === 'leave').length

  const addBtn = (
    <button className="btn btn--ghost btn--block" onClick={onAddSession}>
      + เพิ่มคาบเรียน / บันทึกที่ลืมเช็ค
    </button>
  )

  const noStudents = state.students.length === 0

  const list =
    sessions.length === 0 ? (
      <div className="card">
        <EmptyState
          icon={noStudents ? '👋' : '☕'}
          title={noStudents ? 'ยังไม่มีนักเรียน' : `วัน${TH_DAY[weekday(TODAY)]}นี้ไม่มีคาบสอน`}
          desc={
            noStudents
              ? 'เพิ่มนักเรียนและตั้งวันเรียน แล้วชื่อจะขึ้นในหน้านี้เองทุกสัปดาห์'
              : 'ถ้าสอนไปแล้วแต่ไม่ได้อยู่ในตาราง บันทึกย้อนหลังได้เลย ระบบจะนับเข้าบิลให้'
          }
          action={<button className="btn btn--ink" onClick={onAddSession}>+ เพิ่มคาบเรียน</button>}
        />
      </div>
    ) : (
      <div className="card rise">
        {blocks.map((block) => (
          <div className="tblock" key={block.time}>
            {block.items.length > 1 && <div className="groupmark">คาบกลุ่ม · {block.items.length} คน</div>}
            {block.items.map((c, i) => {
              const st = find(c.studentId)
              if (!st) return null
              const status = state.sessionState[c.id] || 'todo'
              return (
                <div className={`slot${status === 'attended' ? ' slot--done' : ''}${status === 'leave' ? ' slot--leave' : ''}`} key={c.id}>
                  <div className="slot__time">{i === 0 ? c.time : ''}</div>
                  <div className="slot__main">
                    <div className="slot__name">
                      {st.nick}
                      {c.extra && <span className="stu__tag">คาบพิเศษ</span>}
                    </div>
                    <div className="slot__meta">
                      {c.subject} {c.grade} · {TYPE_LABEL[c.type]} {baht(rateOf(st, state))} บ.
                    </div>
                  </div>
                  <div className="slot__act">
                    {status === 'todo' ? (
                      <>
                        <button className="btn btn--ink btn--sm" onClick={() => onCheckIn(c)}>เช็คชื่อ</button>
                        <button className="slot__skip" onClick={() => onLeave(c)}>นักเรียนลา</button>
                      </>
                    ) : (
                      <button
                        className={`pill pill--${status === 'attended' ? 'paid' : 'leave'} pill--tap`}
                        onClick={() => onEditSession(c)}
                        aria-label={`แก้สถานะของ ${st.nick}`}
                      >
                        {status === 'attended' ? '✓ มาเรียน' : 'ลา · นัดชดเชย'}
                        <span className="pill__pen" aria-hidden="true">✎</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        ))}
      </div>
    )

  const hint = (
    <p className="hint">
      <span className="hint__ico">⚠︎</span>
      <span><b>ลืมเช็คชื่อ 1 ครั้ง = สอนฟรี {baht(state.settings.rates.single)} บาท</b></span>
    </p>
  )

  if (desk) {
    return (
      <div className="desk__cols">
        <div>
          {list}
          <div style={{ marginTop: 12 }}>{addBtn}</div>
        </div>
        <aside className="card side-card rise d2">
          <h3>วัน{TH_DAY[weekday(TODAY)]}ที่ {shortDate(TODAY)}</h3>
          <div className="kv"><span>คาบทั้งหมด</span><b>{sessions.length}</b></div>
          <div className="kv"><span>เช็คชื่อแล้ว</span><b>{done}</b></div>
          <div className="kv"><span>ลา · นัดชดเชย</span><b>{away}</b></div>
          <div className="kv"><span>ยังไม่ได้เช็ค</span><b style={{ color: left ? 'var(--cta)' : 'inherit' }}>{left}</b></div>
          {hint}
        </aside>
      </div>
    )
  }

  return (
    <div className="pane">
      <div className="sect">
        <h2>คาบสอนวันนี้</h2>
        <span>เช็คชื่อแล้ว {done}/{sessions.length} คาบ</span>
      </div>
      {list}
      <div style={{ marginTop: 12 }}>{addBtn}</div>
      {hint}
    </div>
  )
}
