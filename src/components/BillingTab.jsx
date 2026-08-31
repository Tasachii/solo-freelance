import { STUDENTS, TUTOR, TYPE_LABEL } from '../data.js'
import { baht, billOf, totals } from '../state.js'

const STATUS_LABEL = { paid: 'จ่ายแล้ว', pending: 'รอสลิป', overdue: 'ค้างจ่าย' }

function ActionFor({ s, status, onSlip, onRemind }) {
  if (status === 'pending')
    return (
      <button className="btn btn--ghost btn--sm" onClick={() => onSlip(s)}>
        ดูสลิป
      </button>
    )
  if (status === 'overdue')
    return (
      <button className="btn btn--cta btn--sm" onClick={() => onRemind(s)}>
        ทวงให้หน่อย
      </button>
    )
  return <span className="bill__tick" aria-label="รับยอดแล้ว">✓</span>
}

export default function BillingTab({ state, onSlip, onRemind, onSendAll, desk }) {
  const { total, paid, outstanding } = totals(state)
  const pct = total > 0 ? (paid / total) * 100 : 0
  const unpaid = STUDENTS.filter((s) => state.status[s.id] !== 'paid').length

  const ctaNote = (
    <>
      งานสิ้นเดือน 5–10 ชั่วโมง เหลือปุ่มเดียว · <b>ระบบเป็นคนทวง ไม่ใช่คุณ</b>
    </>
  )

  if (desk) {
    return (
      <>
        <p className="desk__meta">
          เดือน{TUTOR.month} · คิดจากครั้งที่สอนจริง · {STUDENTS.length} บิล
        </p>

        <div className="card rise" style={{ overflow: 'hidden' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>นักเรียน</th>
                <th>ประเภท</th>
                <th className="tbl__r">คิดจาก</th>
                <th className="tbl__r">ยอด</th>
                <th>สถานะ</th>
                <th className="tbl__act">การกระทำ</th>
              </tr>
            </thead>
            <tbody>
              {STUDENTS.map((s) => {
                const { times, rate, amount, status } = billOf(s, state)
                return (
                  <tr key={s.id}>
                    <td>
                      <div className="tbl__name">{s.nick}</div>
                      <div className="tbl__meta">{s.grade} · {s.subject} · {s.parent}</div>
                    </td>
                    <td style={{ fontSize: 13.5, color: 'var(--muted)' }}>{TYPE_LABEL[s.type]}</td>
                    <td className="tbl__r" style={{ fontSize: 13.5, color: 'var(--muted)' }}>
                      {times} × {baht(rate)}
                    </td>
                    <td className="tbl__r tbl__amt">{baht(amount)}</td>
                    <td><span className={`pill pill--${status}`}>{STATUS_LABEL[status]}</span></td>
                    <td className="tbl__act">
                      <ActionFor s={s} status={status} onSlip={onSlip} onRemind={onRemind} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        <div className="card desk__cta rise d2">
          <p>{ctaNote}</p>
          <button className="btn btn--cta" onClick={onSendAll}>
            ส่งบิลเข้า LINE ผู้ปกครองทุกคน
          </button>
        </div>
      </>
    )
  }

  return (
    <div className="pane">
      <div className="card money rise">
        <div className="money__k">ค่าเรียนเดือน{TUTOR.month}</div>
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
                <ActionFor s={s} status={status} onSlip={onSlip} onRemind={onRemind} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="cta-wrap rise d3">
        <button className="btn btn--cta btn--block" onClick={onSendAll}>
          ส่งบิลเข้า LINE ผู้ปกครองทุกคน
        </button>
      </div>

      <p className="hint">
        <span className="hint__ico">⏱</span>
        <span>{ctaNote}</span>
      </p>
    </div>
  )
}
