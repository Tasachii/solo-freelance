import Sheet from './Sheet.jsx'
import { baht, billOf } from '../state.js'

/** สลิปจากผู้ปกครอง — เคสที่ยอดไม่ตรงคือเคสที่ระบบมีค่าที่สุด */
export default function SlipSheet({ student, state, period, onClose, onConfirm, onRemindDiff }) {
  const { times, amount, uniformRate, mixedRates } = billOf(student, state, period)
  const slip = state.slips[student.id] || { at: '—', ref: '—', match: true }
  const paid = slip.paid ?? amount
  const diff = amount - paid
  const bad = slip.match === false && diff !== 0
  const { bank, accountName, accountNo } = state.settings.payout

  return (
    <Sheet
      title="สลิปที่ผู้ปกครองแนบมา"
      sub={`${student.parent} · ${student.nick}`}
      onClose={onClose}
      footer={
        bad ? (
          <>
            <button className="btn btn--cta btn--block" onClick={() => onRemindDiff(student, diff)}>
              ทวงส่วนต่าง {baht(diff)} บาท
            </button>
            <button className="reset" onClick={() => onConfirm(student)}>
              รับว่าครบ ปิดยอดนี้เลย
            </button>
          </>
        ) : (
          <button className="btn btn--cta btn--block" onClick={() => onConfirm(student)}>
            ยืนยันรับยอด {baht(amount)} บาท
          </button>
        )
      }
    >
      <div className={`slip${bad ? ' slip--bad' : ''}`}>
        <div className="slip__bank">โอนเงินสำเร็จ · {bank}</div>
        <div className="slip__amt">{baht(paid)}.00</div>
        <div className="slip__when">{slip.at}</div>
        <div className="slip__to">
          <span>เข้าบัญชี</span>
          {accountName} ···{accountNo}
        </div>
        <div className="slip__ref">อ้างอิง {slip.ref} · จาก {student.parent}</div>
      </div>

      {bad ? (
        <div className="mismatch">
          <div className="mismatch__hd">⚠️ ยอดไม่ตรงกับบิล</div>
          <div className="kv"><span>ต้องเก็บ</span><b>{baht(amount)} บาท</b></div>
          <div className="kv"><span>โอนมาจริง</span><b>{baht(paid)} บาท</b></div>
          <div className="kv"><span>ขาดอยู่</span><b style={{ color: 'var(--bad)' }}>{baht(diff)} บาท</b></div>
          <p className="mismatch__why">{slip.reason}</p>
        </div>
      ) : (
        <div className="verify">
          <span className="hint__ico">✓</span>
          <span>
            <b>ตรวจกับธนาคารแล้ว ยอดตรง ไม่ใช่สลิปปลอม</b>
            ตรงกับที่ควรได้รับ {times} ครั้ง
            {mixedRates ? ' (มีหลายเรทในเดือนนี้)' : ` × ${baht(uniformRate)} บาท`}
          </span>
        </div>
      )}

      <p className="hint">
        <span className="hint__ico">🔒</span>
        <span>เงินเข้า<b>บัญชีคุณโดยตรง</b> ระบบไม่ได้เป็นตัวกลางรับโอน · กดผิดย้อนได้</span>
      </p>
    </Sheet>
  )
}
