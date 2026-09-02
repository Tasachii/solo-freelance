import Sheet from './Sheet.jsx'
import { baht, billOf, billableStudents } from '../state.js'
import { longMonth } from '../dates.js'
import { EmptyState } from './Field.jsx'

/** จำลองแชท LINE ที่ผู้ปกครองจะเห็น — ส่งเฉพาะคนที่มีบิลรายเดือน (แพ็กใช้ปุ่มชวนต่อแทน) */
export default function LineBillSheet({ state, period, onClose, onConfirm }) {
  const billable = billableStudents(state)
  const sample = billable[0]
  const tutor = state.settings.profile.publicName || state.settings.profile.name
  const { accountName, accountNo, promptpay } = state.settings.payout

  if (!sample) {
    return (
      <Sheet title="ส่งบิลเข้า LINE" onClose={onClose}>
        <EmptyState icon="🧾" title="ไม่มีบิลรายเดือนให้ส่ง"
          desc="นักเรียนทั้งหมดเป็นแบบแพ็กจ่ายล่วงหน้า — ใช้ปุ่มชวนต่อแพ็กในแท็บเงินแทน" />
      </Sheet>
    )
  }

  const bill = billOf(sample, state, period)

  return (
    <Sheet
      title="ตัวอย่างที่ผู้ปกครองจะเห็น"
      sub={`แชท LINE ของ ${sample.parent}`}
      onClose={onClose}
      footer={
        <button className="btn btn--cta btn--block" onClick={onConfirm}>
          ยืนยันส่งทั้ง {billable.length} คน
        </button>
      }
    >
      <div className="line-chat">
        <div className="line-chat__day"><span>30 กันยายน</span></div>
        <div className="bub">
          <div className="bub__hd">ใบแจ้งค่าเรียน · {longMonth(period)}</div>
          {sample.nick} ({sample.subject} {sample.grade})
          <div style={{ marginTop: 9 }}>
            {bill.mode === 'monthly_flat' ? (
              <>
                <div className="bub__row"><span>เหมารายเดือน · เรียนแล้ว</span><span>{bill.times} ครั้ง</span></div>
                <div className="bub__tot"><span>รวม</span><span>{baht(bill.amount)} บาท</span></div>
              </>
            ) : (
              <>
                <div className="bub__row"><span>เรียนแล้ว</span><span>{bill.times} ครั้ง</span></div>
                {!bill.mixedRates && (
                  <div className="bub__row"><span>ครั้งละ</span><span>{baht(bill.uniformRate ?? 0)} บาท</span></div>
                )}
                <div className="bub__tot"><span>รวม</span><span>{baht(bill.amount)} บาท</span></div>
              </>
            )}
          </div>
          <div className="qr">
            <div className="qr__box" aria-hidden="true" />
            <div className="qr__t">
              <b>สแกนจ่าย PromptPay</b>
              <span>{promptpay}<br />{accountName} ···{accountNo}</span>
            </div>
          </div>
          <div className="bub__foot">โอนแล้วแนบสลิปในแชทนี้ได้เลยครับ ระบบตรวจและส่งใบเสร็จให้อัตโนมัติ — {tutor}</div>
        </div>
      </div>

      <div className="block">
        <h4>จะส่งถึง {billable.length} คน (เฉพาะรายเดือน — แพ็กไม่มีบิล)</h4>
        <ul className="recips">
          {billable.map((s) => <li key={s.id}>{s.parent}</li>)}
        </ul>
      </div>

      <p className="hint">
        <span className="hint__ico">⚠︎</span>
        <span>ส่งแล้ว<b>ยกเลิกไม่ได้</b> — แต่มี 6 วินาทีให้กดยกเลิกก่อนส่งจริง</span>
      </p>
    </Sheet>
  )
}
