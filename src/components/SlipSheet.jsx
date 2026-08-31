import Sheet from './Sheet.jsx'
import { TUTOR } from '../data.js'
import { baht, billOf } from '../state.js'

export default function SlipSheet({ student, state, onClose, onConfirm }) {
  const { times, rate, amount } = billOf(student, state)

  return (
    <Sheet
      title="สลิปที่ผู้ปกครองแนบมา"
      sub={`${student.parent} · ${student.nick}`}
      onClose={onClose}
      footer={
        <button className="btn btn--cta btn--block" onClick={() => onConfirm(student)}>
          ยืนยันรับยอด {baht(amount)} บาท
        </button>
      }
    >
      <div className="slip">
        <div className="slip__bank">โอนเงินสำเร็จ · K PLUS</div>
        <div className="slip__amt">{baht(amount)}.00</div>
        <div className="slip__when">30 ก.ย. 2569 · 20:14 น.</div>
        <div className="slip__to">
          <span>เข้าบัญชี</span>
          {TUTOR.bankLine}
        </div>
        <div className="slip__ref">อ้างอิง 0142 8837 5591 · จาก {student.parent}</div>
      </div>

      <div className="verify">
        <span className="hint__ico">✓</span>
        <span>
          <b>ตรวจกับธนาคารแล้ว ยอดตรง ไม่ใช่สลิปปลอม</b>
          ตรงกับที่ควรได้รับ {times} ครั้ง × {baht(rate)} บาท
        </span>
      </div>

      <p className="hint">
        <span className="hint__ico">🔒</span>
        <span>เงินเข้า<b>บัญชีคุณโดยตรง</b> ระบบไม่ได้เป็นตัวกลางรับโอน</span>
      </p>
    </Sheet>
  )
}
