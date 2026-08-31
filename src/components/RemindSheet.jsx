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
    `ถ้าโอนแล้ว รบกวนแนบสลิปในแชทนี้ได้เลยครับ ระบบจะตรวจให้อัตโนมัติ\n` +
    `ถ้าเดือนนี้ยังไม่สะดวก แจ้งมาได้เลยนะครับ ไม่มีปัญหาครับ\n\n` +
    `— ข้อความนี้ส่งโดยระบบอัตโนมัติ`

  return (
    <Sheet
      title="ให้ระบบทวงแทน"
      sub={`ส่งถึง ${student.parent} · ค้าง ${baht(amount)} บาท`}
      onClose={onClose}
      footer={
        <button className="btn btn--cta btn--block" onClick={() => onSend(student)}>
          ส่งข้อความนี้
        </button>
      }
    >
      <div className="msg msg--quote">{text}</div>

      <div className="hint" style={{ marginLeft: 0, marginRight: 0 }}>
        <span className="hint__ico">🤝</span>
        <span>
          สังเกตบรรทัดสุดท้าย — ข้อความลงชื่อว่า<b>ส่งโดยระบบ</b> ไม่ใช่ตัวคุณ
          ผู้ปกครองจึงไม่รู้สึกว่าถูกครูทวง และคุณไม่ต้องเกรงใจจนไม่กล้าทวง
        </span>
      </div>

      <div className="hint" style={{ marginLeft: 0, marginRight: 0 }}>
        <span className="hint__ico">↻</span>
        <span>
          ถ้ายังเงียบ ระบบจะ<b>ทวงซ้ำเองใน 3 วัน</b> แล้วรายงานให้คุณทราบ
          คุณไม่ต้องคอยจำว่าใครยังไม่จ่าย
        </span>
      </div>

      <p className="disclaimer">เดโม · ข้อมูลสมมติทั้งหมด</p>
    </Sheet>
  )
}
