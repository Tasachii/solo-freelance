import { useState } from 'react'
import { baht, billOf, billingOf, totals, makeupsIn, packState, recoveredThisMonth, receiptFor } from '../state.js'
import { shortDate, longMonth } from '../dates.js'
import { navigate } from '../router.js'
import { EmptyState } from './Field.jsx'

const MONTHLY_MODES = ['per_session', 'monthly_flat']

export default function MoneyTab({ state, period, onSlip, onRemind, onUndoPaid, onSendAll, onParentView, onRenew }) {
  const [showAll, setShowAll] = useState(false)
  const { total, paid, outstanding } = totals(state, period)
  const makeups = makeupsIn(state, period)
  const rec = recoveredThisMonth(state, period)

  const monthly = state.students.filter((s) => MONTHLY_MODES.includes(billingOf(s, state).mode))
  const monthlyUnpaid = monthly.filter((s) => !['paid', 'none'].includes(billOf(s, state, period).status))
  const monthlyShown = showAll ? monthly : monthlyUnpaid

  // แพ็ก: โชว์เฉพาะคนที่ต้องขยับ — เหลือ ≤2 / หมด / เกิน
  const packNeedy = state.students
    .map((s) => ({ s, pk: packState(s) }))
    .filter((x) => x.pk && x.pk.state !== 'ok')

  if (state.students.length === 0) {
    return <EmptyState icon="🧾" title="ยังไม่มีบิล" desc="เพิ่มนักเรียนแล้วระบบจะออกบิลให้เอง" />
  }

  return (
    <div className="home">
      <section className="saved-card">
        <h2 className="saved-card__h">เดือนนี้ระบบช่วยไว้เท่าไหร่</h2>
        <div className="saved-card__grid">
          <div className="saved-card__row"><span>รายได้ที่ควรได้เดือนนี้</span><b>{baht(total)} บาท</b></div>
          <div className="saved-card__row"><span>เข้าแล้ว / ค้าง</span><b>{baht(paid)} / {baht(outstanding)}</b></div>
          <div className="saved-card__row">
            <span>เงินที่ระบบช่วยกู้คืน</span>
            <b>{baht(rec.total)} บาท</b>
          </div>
          <div className="saved-card__row saved-card__row--sub">
            <span>
              ทวงแล้วได้เงิน {rec.dunnedCount} คน · ครั้งที่เคยลืมจด {rec.forgottenTimes} ครั้ง
              {rec.packTimes > 0 && ` · จับแพ็กหมด ${rec.packTimes} ครั้ง`}
            </span>
          </div>
        </div>
        <p className="saved-card__foot">
          ช่วยไว้ <b>{baht(rec.total)} บาท</b> · ค่าบริการ 299 บาท
        </p>
      </section>

      <section className="home__money">
        <b style={{ color: 'var(--text)' }}>{baht(total)}</b>
        <span>ค่าเรียนเดือน{longMonth(period)}</span>
        <div className="split2">
          <span><i className="dot dot--ok" />เข้าแล้ว {baht(paid)}</span>
          <span><i className="dot dot--bad" />ค้าง {baht(outstanding)}</span>
        </div>
      </section>

      <section className="home__sec">
        <h2 className="home__lbl">
          รายเดือน — ต้องส่งบิล{!showAll && monthlyUnpaid.length > 0 && ` · ค้าง ${monthlyUnpaid.length} คน`}
        </h2>
        {monthlyShown.length === 0 ? (
          <p className="home__quiet">เก็บครบทุกคนแล้ว</p>
        ) : (
          <ul className="rows2">
            {monthlyShown.map((s) => {
              const bill = billOf(s, state, period)
              const receipt = receiptFor(state, s.id, period)
              return (
                <li className="row2" key={s.id}>
                  <span className="row2__main">
                    <span className="row2__n">{s.nick}</span>
                    <span className="row2__why">
                      {bill.mode === 'monthly_flat'
                        ? `เหมา ${baht(bill.amount)} บาท/เดือน · เรียน ${bill.times} ครั้ง`
                        : `${bill.times} ครั้ง · ${baht(bill.amount)} บาท`}
                      {makeups[s.id]?.length > 0 && (
                        <span className="makeup-chip">ชดเชย {makeups[s.id].map(shortDate).join(', ')}</span>
                      )}
                    </span>
                  </span>
                  {bill.status === 'paid' && (
                    <span className="row2__acts">
                      {receipt && (
                        <button className="btn btn--ghost btn--sm" onClick={() => navigate(`/receipt/${receipt.id}`)}>
                          ใบเสร็จ
                        </button>
                      )}
                      <button className="row2__done" onClick={() => onUndoPaid(s)}>จ่ายแล้ว</button>
                    </span>
                  )}
                  {(bill.status === 'pending' || bill.status === 'partial') && (
                    <button className="btn btn--ghost btn--sm" onClick={() => onSlip(s)}>ดูสลิป</button>
                  )}
                  {bill.status === 'overdue' && (
                    <button className="btn btn--cta btn--sm" onClick={() => onRemind(s)}>ทวง</button>
                  )}
                  {bill.status === 'none' && <span className="row2__why">—</span>}
                </li>
              )
            })}
          </ul>
        )}
        <button className="home__more" onClick={() => setShowAll((v) => !v)}>
          {showAll ? 'ดูเฉพาะที่ยังไม่จ่าย' : 'ดูทุกคน'}
        </button>
      </section>

      <section className="home__sec">
        <h2 className="home__lbl">แพ็ก — ต้องชวนต่อ{packNeedy.length > 0 && ` · ${packNeedy.length} คน`}</h2>
        {packNeedy.length === 0 ? (
          <p className="home__quiet">ทุกแพ็กยังเหลือเยอะ</p>
        ) : (
          <ul className="rows2">
            {packNeedy.map(({ s, pk }) => (
              <li className="row2" key={s.id}>
                <span className="row2__main">
                  <span className="row2__n">{s.nick}</span>
                  <span className={`row2__why ${pk.state === 'over' ? 'watch__why--bad' : 'watch__why--warn'}`}>
                    {pk.state === 'over'
                      ? `แพ็กหมดแล้ว เกิน ${pk.over} ครั้งยังไม่ได้เก็บ`
                      : pk.state === 'out'
                        ? `ใช้ครบ ${pk.total} ครั้งพอดี`
                        : `เหลือ ${pk.left}/${pk.total} ครั้ง`}
                  </span>
                </span>
                <button
                  className={`btn btn--sm ${pk.state === 'over' ? 'btn--cta' : 'btn--ghost'}`}
                  onClick={() => onRenew(s)}
                >
                  ส่งข้อความชวนต่อ
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="home__sec">
        <button className="btn btn--cta btn--block" onClick={onSendAll}>ส่งบิลเข้า LINE ทุกคน</button>
        <div className="home__links">
          <button className="home__more" onClick={() => navigate('/receipts')}>ใบเสร็จทั้งหมดเดือนนี้</button>
          <button className="home__more" onClick={onParentView}>ดูมุมมองผู้ปกครอง →</button>
        </div>
      </section>
    </div>
  )
}
