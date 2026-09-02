import { navigate } from '../router.js'
import { useDemoState, baht, receiptFor, billOf } from '../state.js'
import { TODAY_PERIOD } from '../data.js'
import { longMonth } from '../dates.js'
import { EmptyState } from './Field.jsx'

/** ใบเสร็จรับเงิน — print-friendly ปุ่มดาวน์โหลดใช้ window.print() */
export function ReceiptPage({ receiptId }) {
  const { state } = useDemoState()
  const receipt = (state.receipts || []).find((r) => r.id === receiptId)

  if (!receipt) {
    return (
      <div className="page">
        <div className="page__body">
          <EmptyState icon="🧾" title="ไม่พบใบเสร็จ" desc="ใบเสร็จอาจถูกลบไปพร้อมการรีเซ็ตเดโม"
            action={<button className="btn btn--ink" onClick={() => navigate('/app/money')}>กลับหน้าเงิน</button>} />
        </div>
      </div>
    )
  }

  const student = state.students.find((s) => s.id === receipt.studentId)
  const { profile, payout } = state.settings

  return (
    <div className="page page--print">
      <header className="page__hd no-print">
        <button className="page__back" onClick={() => navigate('/app/money')} aria-label="กลับ">‹</button>
        <span className="land__tag">เดโม · ข้อมูลสมมติทั้งหมด</span>
      </header>

      <div className="page__body">
        <article className="card receipt">
          <header className="receipt__hd">
            <div>
              <h1 className="receipt__h1">ใบเสร็จรับเงิน</h1>
              <p className="receipt__en">Receipt</p>
            </div>
            <div className="receipt__no">
              <span>เลขที่</span>
              <b>{receipt.no}</b>
            </div>
          </header>

          <dl className="receipt__meta">
            <div><dt>ผู้รับเงิน</dt><dd>{profile.publicName || profile.name} · {payout.accountName} ···{payout.accountNo}</dd></div>
            <div><dt>ผู้จ่าย</dt><dd>{student ? `${student.parent} (${student.nick})` : '—'}</dd></div>
            <div><dt>วันที่รับเงิน</dt><dd>{receipt.date}</dd></div>
          </dl>

          <table className="receipt__tbl">
            <thead>
              <tr><th>รายการ</th><th className="r">จำนวนเงิน</th></tr>
            </thead>
            <tbody>
              <tr><td>{receipt.desc}</td><td className="r">{baht(receipt.amount)}</td></tr>
            </tbody>
            <tfoot>
              <tr><td>รวมทั้งสิ้น</td><td className="r">{baht(receipt.amount)} บาท</td></tr>
            </tfoot>
          </table>

          <p className="receipt__note">ชำระผ่านการโอน · ระบบตรวจสอบสลิปกับรายการเดินบัญชีแล้ว</p>
          <p className="receipt__demo">เดโม · ข้อมูลสมมติทั้งหมด — เอกสารนี้ไม่ใช่ใบเสร็จจริง</p>
        </article>

        <div className="no-print" style={{ marginTop: 14, display: 'flex', gap: 10, justifyContent: 'center' }}>
          <button className="btn btn--cta" onClick={() => window.print()}>ดาวน์โหลด PDF</button>
          <button className="btn btn--ghost" onClick={() => navigate('/receipts')}>ใบเสร็จทั้งหมด</button>
        </div>
      </div>
    </div>
  )
}

/** รายการใบเสร็จของเดือนนี้ */
export function ReceiptListPage() {
  const { state } = useDemoState()
  const receipts = (state.receipts || []).filter((r) => r.period === TODAY_PERIOD)

  return (
    <div className="page">
      <header className="page__hd">
        <button className="page__back" onClick={() => navigate('/app/money')} aria-label="กลับ">‹</button>
        <span className="land__tag">เดโม · ข้อมูลสมมติทั้งหมด</span>
      </header>

      <div className="page__body">
        <h1 className="page__h1">ใบเสร็จ</h1>
        <p className="page__sub">เดือน{longMonth(TODAY_PERIOD)} · {receipts.length} ใบ</p>

        {receipts.length === 0 ? (
          <EmptyState icon="🧾" title="ยังไม่มีใบเสร็จเดือนนี้"
            desc="เมื่อยืนยันรับยอดจากสลิป ระบบจะออกใบเสร็จและส่งให้ผู้ปกครองอัตโนมัติ" />
        ) : (
          <ul className="rows2">
            {receipts.map((r) => {
              const st = state.students.find((s) => s.id === r.studentId)
              return (
                <li className="row2" key={r.id}>
                  <button className="row2__person" onClick={() => navigate(`/receipt/${r.id}`)}>
                    <span className="row2__main">
                      <span className="row2__n">{st?.nick ?? '—'} · {baht(r.amount)} บาท</span>
                      <span className="row2__why">{r.no} · {r.date}</span>
                    </span>
                    <span className="watch__go" aria-hidden="true">›</span>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
