import Sheet from './Sheet.jsx'
import { baht, billOf } from '../state.js'
import { longMonth } from '../dates.js'
import { EmptyState } from './Field.jsx'

/** จำลองแชท LINE ที่ผู้ปกครองจะเห็น */
export default function LineBillSheet({ state, period, onClose, onConfirm }) {
  const MONTH = longMonth(period)
  const sample = state.students[0]
  if (!sample) {
    return (
      <Sheet title="ส่งบิลเข้า LINE" onClose={onClose}>
        <EmptyState icon="🧾" title="ยังไม่มีบิลให้ส่ง" desc="เพิ่มนักเรียนและเช็คชื่อก่อนครับ" />
      </Sheet>
    )
  }

  const { times, amount, uniformRate, mixedRates } = billOf(sample, state, period)
  const { accountName, accountNo, promptpay } = state.settings.payout
  const tutor = state.settings.profile.publicName || state.settings.profile.name

  return (
    <Sheet
      title="ตัวอย่างที่ผู้ปกครองจะเห็น"
      sub={`แชท LINE ของ ${sample.parent}`}
      onClose={onClose}
      footer={
        <button className="btn btn--cta btn--block" onClick={onConfirm}>
          ยืนยันส่งทั้ง {state.students.length} คน
        </button>
      }
    >
      <div className="line-chat">
        <div className="line-chat__day"><span>30 กันยายน</span></div>
        <div className="bub">
          <div className="bub__hd">ใบแจ้งค่าเรียน · {MONTH}</div>
          {sample.nick} ({sample.subject} {sample.grade})
          <div style={{ marginTop: 9 }}>
            <div className="bub__row"><span>เรียนแล้ว</span><span>{times} ครั้ง</span></div>
            {!mixedRates && <div className="bub__row"><span>ครั้งละ</span><span>{baht(uniformRate ?? 0)} บาท</span></div>}
            <div className="bub__tot"><span>รวม</span><span>{baht(amount)} บาท</span></div>
          </div>
          <div className="qr">
            <div className="qr__box" aria-hidden="true" />
            <div className="qr__t">
              <b>สแกนจ่าย PromptPay</b>
              <span>{promptpay}<br />{accountName} ···{accountNo}</span>
            </div>
          </div>
          <div className="bub__foot">โอนแล้วแนบสลิปในแชทนี้ได้เลยครับ ระบบตรวจให้อัตโนมัติ — {tutor}</div>
        </div>
      </div>

      <div className="block">
        <h4>จะส่งถึง {state.students.length} คน</h4>
        <ul className="recips">
          {state.students.map((s) => <li key={s.id}>{s.parent}</li>)}
        </ul>
      </div>

      <p className="hint">
        <span className="hint__ico">⚠︎</span>
        <span>ส่งแล้ว<b>ยกเลิกไม่ได้</b> ตรวจตัวอย่างให้ดีก่อนกดยืนยัน</span>
      </p>
    </Sheet>
  )
}
