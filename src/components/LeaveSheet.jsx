import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { TextField } from './Field.jsx'
import { baht, rateOf } from '../state.js'
import { TODAY } from '../data.js'

/** ลาไม่ได้มีแบบเดียว — แจ้งล่วงหน้ากับแจ้งนาทีสุดท้ายคนละเรื่องกัน */
export default function LeaveSheet({ session, state, onClose, onPick }) {
  const student = state.students.find((s) => s.id === session.studentId)
  const rate = student ? rateOf(student, state) : 0
  const [mode, setMode] = useState(null)
  const [date, setDate] = useState(TODAY)

  if (mode === 'makeup') {
    return (
      <Sheet title="นัดชดเชยแล้ว" sub={student?.nick} onClose={onClose}
        footer={
          <>
            <button className="btn btn--cta btn--block" onClick={() => onPick(session, 'makeup', date)}>
              บันทึกคาบชดเชย
            </button>
            <button className="reset" onClick={() => setMode(null)}>← กลับ</button>
          </>
        }>
        <TextField label="นัดชดเชยวันไหน" type="date" value={date} onChange={(e) => setDate(e.target.value)}
          hint="จะขึ้นในแท็บเงินว่านัดชดเชยไว้แล้ว ผู้ปกครองจึงไม่รู้สึกว่าถูกคิดเงินเกิน" />
      </Sheet>
    )
  }

  const OPTS = [
    { id: 'leave', label: 'ลา (ไม่คิดเงิน)', desc: 'แจ้งล่วงหน้า ไม่นับเข้าบิล' },
    { id: 'leaveCharged', label: 'ลา (คิดเงิน แจ้งช้า)', desc: `แจ้งกระชั้น กันเวลาไว้แล้ว · +${baht(rate)} บาท` },
    { id: 'makeup', label: 'นัดชดเชยแล้ว', desc: 'ไม่คิดเงิน แต่จองวันเรียนชดเชยไว้' },
  ]

  return (
    <Sheet title={`${student?.nick ?? ''} ลา`} sub={`${session.time} · ${session.subject}`} onClose={onClose}>
      <div className="opts">
        {OPTS.map((o) => (
          <button key={o.id} className="opt"
            onClick={() => (o.id === 'makeup' ? setMode('makeup') : onPick(session, o.id))}>
            <span className="opt__main">
              <span className="opt__label">{o.label}</span>
              <span className="opt__desc">{o.desc}</span>
            </span>
            <span className="opt__tick" style={{ color: 'var(--muted)' }}>›</span>
          </button>
        ))}
      </div>
    </Sheet>
  )
}
