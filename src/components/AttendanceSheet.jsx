import Sheet from './Sheet.jsx'
import { baht, rateOf } from '../state.js'

/** แก้สถานะคาบที่กดไปแล้ว — ทางออกของ "กดผิด" ที่รู้ตัวช้า */
export default function AttendanceSheet({ session, state, onClose, onSet }) {
  const student = state.students.find((s) => s.id === session.studentId)
  const current = state.sessionState[session.id]
  const rate = student ? rateOf(student, state) : 0

  const OPTIONS = [
    { id: 'attended', label: '✓ มาเรียน', desc: `นับเข้าบิล +${baht(rate)} บาท` },
    { id: 'leave', label: 'ลา · นัดชดเชย', desc: 'ไม่คิดเงิน เก็บเป็นคาบชดเชย' },
    { id: 'todo', label: 'ยังไม่ได้เช็ค', desc: 'กลับไปเป็นคาบที่ยังไม่ได้บันทึก' },
  ]

  return (
    <Sheet
      title={`แก้สถานะ · ${student?.nick ?? ''}`}
      sub={`${session.time} · ${session.subject} ${session.grade}`}
      onClose={onClose}
    >
      <div className="opts">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            className={`opt${current === o.id ? ' opt--on' : ''}`}
            onClick={() => onSet(session, o.id)}
          >
            <span className="opt__main">
              <span className="opt__label">{o.label}</span>
              <span className="opt__desc">{o.desc}</span>
            </span>
            {current === o.id && <span className="opt__tick" aria-label="เลือกอยู่">✓</span>}
          </button>
        ))}
      </div>
      <p className="hint">
        <span className="hint__ico">↺</span>
        <span>เปลี่ยนกี่ครั้งก็ได้ <b>ยอดเงินคำนวณใหม่ทันที</b></span>
      </p>
    </Sheet>
  )
}
