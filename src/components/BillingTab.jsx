import { STUDENTS, TUTOR } from '../data.js'
import { baht, billOf, totals } from '../state.js'

const STATUS_LABEL = { paid: 'จ่ายแล้ว', pending: 'รอสลิป', overdue: 'ค้างจ่าย' }

export default function BillingTab({ state, onSlip, onRemind, onSendAll }) {
  const { total, paid, outstanding } = totals(state)
  const pct = total > 0 ? (paid / total) * 100 : 0
  const unpaid = STUDENTS.filter((s) => state.status[s.id] !== 'paid').length

  return (
    <div className="pane">
      <div className="card money rise">
        <div className="money__k">ค่าเรียนเดือน{TUTOR.month} (คิดจากครั้งที่สอนจริง)</div>
        <div className="money__v">
          {baht(total)}
          <small>บาท</small>
        </div>

        <div className="money__bar" aria-hidden="true">
          <i style={{ width: `${pct}%` }} />
        </div>

        <div className="money__split">
          <div className="money__cell money__cell--in">
            <span>เข้าแล้ว</span>
            <b>{baht(paid)}</b>
          </div>
          <div className="money__cell money__cell--out">
            <span>ค้าง {unpaid} คน</span>
            <b>{baht(outstanding)}</b>
          </div>
        </div>
      </div>

      <div className="sect">
        <h2>รายคน</h2>
        <span>{STUDENTS.length} บิล</span>
      </div>

      <div className="card rise d2">
        {STUDENTS.map((s) => {
          const { times, rate, amount, status } = billOf(s, state)
          return (
            <div className="bill" key={s.id}>
              <div className="bill__main">
                <div className="bill__name">{s.nick}</div>
                <div className="bill__calc">
                  {times} ครั้ง × {baht(rate)} = <b>{baht(amount)} บาท</b>
                </div>
              </div>

              <div className="bill__act">
                <span className={`pill pill--${status}`}>{STATUS_LABEL[status]}</span>
                {status === 'pending' && (
                  <button className="btn btn--ghost btn--sm" onClick={() => onSlip(s)}>
                    ดูสลิป
                  </button>
                )}
                {status === 'overdue' && (
                  <button className="btn btn--cta btn--sm" onClick={() => onRemind(s)}>
                    ทวงให้หน่อย
                  </button>
                )}
                {status === 'paid' && (
                  <span className="bill__tick" aria-label="รับยอดแล้ว">
                    ✓
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      <div className="cta-wrap rise d3">
        <button className="btn btn--cta btn--block" onClick={onSendAll}>
          ส่งบิลเข้า LINE ผู้ปกครองทุกคน
        </button>
        <p className="cta-sub">
          ส่งพร้อม QR PromptPay ของคุณเอง · เงินเข้าบัญชีคุณโดยตรง ระบบไม่แตะเงิน
        </p>
      </div>

      <div className="hint rise d4">
        <span className="hint__ico">⏱</span>
        <span>
          งานสิ้นเดือนที่เคยกิน <b>5–10 ชั่วโมง</b> เหลือปุ่มเดียว —
          และคนที่ทวงคือระบบ ไม่ใช่คุณ คุณจึงไม่ต้องเสียความสัมพันธ์กับผู้ปกครอง
        </span>
      </div>

      <p className="disclaimer">เดโม · ข้อมูลสมมติทั้งหมด</p>
    </div>
  )
}
