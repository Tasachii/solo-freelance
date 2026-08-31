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
        <div className="slip__ref">รหัสอ้างอิง 0142 8837 5591 · จาก {student.parent}</div>
      </div>

      <div className="verify">
        <span className="hint__ico">✓</span>
        <span>
          <b>ตรวจกับธนาคารแล้ว ยอดตรง ไม่ใช่สลิปปลอม</b>
          ระบบเทียบยอด เวลา และบัญชีปลายทางกับรายการเดินบัญชีจริงให้อัตโนมัติ
        </span>
      </div>

      <div className="block">
        <h4>ยอดที่ควรได้รับ</h4>
        <div className="card" style={{ padding: '4px 14px' }}>
          <div className="kv">
            <span>คิดจาก</span>
            <b>
              {times} ครั้ง × {baht(rate)}
            </b>
          </div>
          <div className="kv">
            <span>รวม</span>
            <b>{baht(amount)} บาท</b>
          </div>
          <div className="kv">
            <span>ผลตรวจ</span>
            <b style={{ color: 'var(--paid-fg)' }}>ยอดตรงกัน</b>
          </div>
        </div>
      </div>

      <div className="hint" style={{ marginLeft: 0, marginRight: 0 }}>
        <span className="hint__ico">🔒</span>
        <span>
          เงินโอนเข้า<b>บัญชีของคุณโดยตรง</b> ระบบไม่ได้ถือเงินและไม่ได้เป็นตัวกลางรับโอน
          หน้าที่ของระบบคือตรวจสลิปและบันทึกให้เท่านั้น
        </span>
      </div>

      <p className="disclaimer">เดโม · ข้อมูลสมมติทั้งหมด</p>
    </Sheet>
  )
}
