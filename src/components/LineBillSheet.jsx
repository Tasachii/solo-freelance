import Sheet from './Sheet.jsx'
import { STUDENTS, TUTOR } from '../data.js'
import { baht, billOf } from '../state.js'

/** จำลองแชท LINE ที่ผู้ปกครองจะเห็น — ใช้ น้องแพรว เป็นตัวอย่าง */
export default function LineBillSheet({ state, onClose, onConfirm }) {
  const sample = STUDENTS.find((s) => s.id === 's2') || STUDENTS[0]
  const { times, rate, amount } = billOf(sample, state)

  return (
    <Sheet
      title="ตัวอย่างที่ผู้ปกครองจะเห็น"
      sub={`แชท LINE ของ ${sample.parent}`}
      onClose={onClose}
      footer={
        <button className="btn btn--cta btn--block" onClick={onConfirm}>
          ยืนยันส่งทั้ง {STUDENTS.length} คน
        </button>
      }
    >
      <div className="line-chat">
        <div className="line-chat__day"><span>30 กันยายน</span></div>

        <div className="bub">
          <div className="bub__hd">ใบแจ้งค่าเรียน · {TUTOR.month}</div>
          {sample.nick} ({sample.subject} {sample.grade})
          <div style={{ marginTop: 9 }}>
            <div className="bub__row"><span>เรียนแล้ว</span><span>{times} ครั้ง</span></div>
            <div className="bub__row"><span>ครั้งละ</span><span>{baht(rate)} บาท</span></div>
            <div className="bub__tot"><span>รวม</span><span>{baht(amount)} บาท</span></div>
          </div>

          <div className="qr">
            <div className="qr__box" aria-hidden="true" />
            <div className="qr__t">
              <b>สแกนจ่าย PromptPay</b>
              <span>{TUTOR.bankLine}</span>
            </div>
          </div>

          <div className="bub__foot">โอนแล้วแนบสลิปในแชทนี้ได้เลยครับ ระบบตรวจให้อัตโนมัติ</div>
        </div>
      </div>

      <div className="block">
        <h4>จะส่งถึง {STUDENTS.length} คน</h4>
        <ul className="recips">
          {STUDENTS.map((s) => (
            <li key={s.id}>{s.parent}</li>
          ))}
        </ul>
      </div>

      <p className="hint">
        <span className="hint__ico">🔒</span>
        <span>QR เป็น PromptPay <b>ของคุณเอง</b> เงินวิ่งตรงเข้าบัญชีคุณ</span>
      </p>
    </Sheet>
  )
}
