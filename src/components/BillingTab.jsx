import { useState } from 'react'
import { TYPE_LABEL, STATUS_LABEL } from '../data.js'
import { longMonth } from '../dates.js'
import { baht, billOf, totals } from '../state.js'
import { EmptyState } from './Field.jsx'

const FILTERS = [
  { id: 'all', label: 'ทั้งหมด' },
  { id: 'overdue', label: 'ค้างจ่าย' },
  { id: 'pending', label: 'รอสลิป' },
  { id: 'paid', label: 'จ่ายแล้ว' },
]

function Action({ s, status, onSlip, onRemind, onUndoPaid }) {
  if (status === 'none') return <span className="bill__none">—</span>
  if (status === 'pending')
    return <button className="btn btn--ghost btn--sm" onClick={() => onSlip(s)}>ดูสลิป</button>
  if (status === 'overdue')
    return <button className="btn btn--cta btn--sm" onClick={() => onRemind(s)}>ทวงให้หน่อย</button>
  return (
    <button className="btn btn--ghost btn--sm" onClick={() => onUndoPaid(s)} title="รับยอดผิดคน? กดเพื่อย้อนกลับ">
      ↺ ยกเลิกรับยอด
    </button>
  )
}

export default function BillingTab({ state, period, onSlip, onRemind, onUndoPaid, onSendAll, desk }) {
  const MONTH = longMonth(period)
  const [filter, setFilter] = useState('all')
  const { total, paid, outstanding } = totals(state, period)
  const pct = total > 0 ? (paid / total) * 100 : 0
  const unpaid = state.students.filter((s) => billOf(s, state, period).status !== 'paid').length
  const shown = state.students.filter((s) => filter === 'all' || billOf(s, state, period).status === filter)

  const ctaNote = (
    <>งานสิ้นเดือน 5–10 ชั่วโมง เหลือปุ่มเดียว · <b>ระบบเป็นคนทวง ไม่ใช่คุณ</b></>
  )

  const chips = (
    <div className="chips" role="group" aria-label="กรองตามสถานะ" style={{ marginBottom: 11 }}>
      {FILTERS.map((f) => (
        <button key={f.id} className={`chip${filter === f.id ? ' chip--on' : ''}`}
          aria-pressed={filter === f.id} onClick={() => setFilter(f.id)}>
          {f.label}
        </button>
      ))}
    </div>
  )

  if (state.students.length === 0) {
    const empty = (
      <div className="card">
        <EmptyState icon="🧾" title="ยังไม่มีบิล" desc="เพิ่มนักเรียนและเช็คชื่อ แล้วระบบจะออกบิลให้อัตโนมัติ" />
      </div>
    )
    return desk ? empty : <div className="pane">{empty}</div>
  }

  if (desk) {
    return (
      <>
        <p className="desk__meta">เดือน{MONTH} · คิดจากครั้งที่สอนจริง · {state.students.length} บิล</p>
        {chips}
        <div className="card rise" style={{ overflow: 'hidden' }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>นักเรียน</th><th>ประเภท</th>
                <th className="tbl__r">คิดจาก</th><th className="tbl__r">ยอด</th>
                <th>สถานะ</th><th className="tbl__act">การกระทำ</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((s) => {
                const { times, amount, status, uniformRate, mixedRates } = billOf(s, state, period)
                return (
                  <tr key={s.id}>
                    <td>
                      <div className="tbl__name">{s.nick}</div>
                      <div className="tbl__meta">{s.grade} · {s.subject} · {s.parent}</div>
                    </td>
                    <td style={{ fontSize: 13.5, color: 'var(--muted)' }}>{TYPE_LABEL[s.type]}</td>
                    <td className="tbl__r" style={{ fontSize: 13.5, color: 'var(--muted)' }}>{mixedRates ? `${times} ครั้ง · หลายเรท` : `${times} × ${baht(uniformRate ?? 0)}`}</td>
                    <td className="tbl__r tbl__amt">{baht(amount)}</td>
                    <td><span className={`pill pill--${status}`}>{STATUS_LABEL[status]}</span></td>
                    <td className="tbl__act">
                      <Action s={s} status={status} onSlip={onSlip} onRemind={onRemind} onUndoPaid={onUndoPaid} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {shown.length === 0 && (
            <EmptyState icon="🔍" title="ไม่มีบิลในตัวกรองนี้"
              action={<button className="btn btn--ghost" onClick={() => setFilter('all')}>ดูทั้งหมด</button>} />
          )}
        </div>
        <div className="card desk__cta rise d2">
          <p>{ctaNote}</p>
          <button className="btn btn--cta" onClick={onSendAll}>ส่งบิลเข้า LINE ผู้ปกครองทุกคน</button>
        </div>
      </>
    )
  }

  return (
    <div className="pane">
      <div className="card money rise">
        <div className="money__k">ค่าเรียนเดือน{MONTH}</div>
        <div className="money__v">{baht(total)}<small>บาท</small></div>
        <div className="money__bar" aria-hidden="true"><i style={{ width: `${pct}%` }} /></div>
        <div className="money__split">
          <div className="money__cell money__cell--in"><span>เข้าแล้ว</span><b>{baht(paid)}</b></div>
          <div className="money__cell money__cell--out"><span>ค้าง {unpaid} คน</span><b>{baht(outstanding)}</b></div>
        </div>
      </div>

      {chips}

      <div className="card rise d2">
        {shown.map((s) => {
          const { times, amount, status, uniformRate, mixedRates } = billOf(s, state, period)
          return (
            <div className="bill" key={s.id}>
              <div className="bill__main">
                <div className="bill__name">{s.nick}</div>
                <div className="bill__calc">{mixedRates ? `${times} ครั้ง (หลายเรท)` : `${times} ครั้ง × ${baht(uniformRate ?? 0)}`} = <b>{baht(amount)} บาท</b></div>
              </div>
              <div className="bill__act">
                <span className={`pill pill--${status}`}>{STATUS_LABEL[status]}</span>
                <Action s={s} status={status} onSlip={onSlip} onRemind={onRemind} onUndoPaid={onUndoPaid} />
              </div>
            </div>
          )
        })}
        {shown.length === 0 && (
          <EmptyState icon="🔍" title="ไม่มีบิลในตัวกรองนี้"
            action={<button className="btn btn--ghost" onClick={() => setFilter('all')}>ดูทั้งหมด</button>} />
        )}
      </div>

      <div className="cta-wrap rise d3">
        <button className="btn btn--cta btn--block" onClick={onSendAll}>ส่งบิลเข้า LINE ผู้ปกครองทุกคน</button>
      </div>
      <p className="hint"><span className="hint__ico">⏱</span><span>{ctaNote}</span></p>
    </div>
  )
}
