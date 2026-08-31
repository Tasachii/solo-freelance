import Sheet from './Sheet.jsx'
import { TUTOR } from '../data.js'
import { baht, billOf } from '../state.js'

export default function RemindSheet({ student, state, onClose, onSend }) {
  const { times, rate, amount } = billOf(student, state)

  const text =
    `แจ้งเตือนจากระบบของ${TUTOR.name}ครับ\n\n` +
    `เรียน ${student.parent}\n` +
    `ค่าเรียนของ${student.nick} เดือน${TUTOR.month}\n` +
    `${times} ครั้ง × ${baht(rate)} = ${baht(amount)} บาท\n` +
    `ระบบยังไม่พบยอดเข้าบัญชีนะครับ\n\n` +
    `ถ้าโอนแล้ว รบกวนแนบสลิปในแชทนี้ได้เลยครับ\n` +
    `ถ้าเดือนนี้ยังไม่สะดวก แจ้งมาได้เลยนะครับ ไม่มีปัญหาครับ\n\n` +
    `— ข้อความนี้ส่งโดยระบบอัตโนมัติ`

  return (
    <Sheet
      title="ให้ระบบทวงแทน"
      sub={`${student.parent} · ค้าง ${baht(amount)} บาท`}
      onClose={onClose}
      footer={
        <button className="btn btn--cta btn--block" onClick={() => onSend(student)}>
          ส่งข้อความนี้
        </button>
      }
    >
      <div className="msg">{text}</div>
      <p className="hint">
        <span className="hint__ico">🤝</span>
        <span>ลงชื่อว่า<b>ส่งโดยระบบ</b> ผู้ปกครองจึงไม่รู้สึกว่าถูกครูทวง</span>
      </p>
    </Sheet>
  )
}
