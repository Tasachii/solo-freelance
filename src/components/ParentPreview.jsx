import { useState } from 'react'
import { navigate } from '../router.js'
import { freshState, billOf, baht, recordsIn } from '../state.js'
import { shortDate, weekday, TH_DAY_SHORT } from '../dates.js'
import { TODAY_PERIOD } from '../data.js'

/** สิ่งที่ผู้ปกครองเห็นเมื่อกดลิงก์บิลจาก LINE — หน้าเดียวจบ ไม่ต้องโหลดแอป */
export default function ParentPreview() {
  const [step, setStep] = useState('idle') // idle | checking | done
  const demo = freshState()
  const student = demo.students.find((s) => s.id === 's2')
  const { times, amount } = billOf(student, demo, TODAY_PERIOD)
  const records = recordsIn(demo, student.id, TODAY_PERIOD)
  const timeFor = (date) =>
    (student.schedule || []).find((sl) => sl.day === weekday(date))?.time ?? '—'
  const { accountName, accountNo } = demo.settings.payout

  const attach = () => {
    setStep('checking')
    setTimeout(() => setStep('done'), 1500)
  }

  return (
    <div className="page page--parent">
      <header className="page__hd">
        <button className="page__back" onClick={() => navigate('/app/money')} aria-label="กลับ">‹</button>
        <span className="land__tag">เดโม · ข้อมูลสมมติทั้งหมด</span>
      </header>

      <div className="page__body">
        <div className="card bill-doc">
          <p className="bill-doc__from">จาก {demo.settings.profile.publicName}</p>
          <h1 className="bill-doc__h1">ใบแจ้งค่าเรียน</h1>
          <p className="bill-doc__sub">{student.nick} · กันยายน 2569</p>

          <table className="bill-doc__tbl">
            <thead>
              <tr><th>วันที่</th><th>เวลา</th><th>วิชา</th><th aria-label="สถานะ" /></tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r.id}>
                  <td>{shortDate(r.date)} <span className="dim">({TH_DAY_SHORT[weekday(r.date)]})</span></td>
                  <td className="dim">{timeFor(r.date)}</td>
                  <td className="dim">{student.subject}</td>
                  <td className="ok">✓</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="bill-doc__total">
            <span>เรียนทั้งหมด {times} ครั้ง</span>
            <b>{baht(amount)} บาท</b>
          </div>
        </div>

        {step === 'done' ? (
          <div className="paid-ok">
            <span className="paid-ok__tick" aria-hidden="true">✓</span>
            <b>ได้รับยอดแล้ว ขอบคุณครับ</b>
            <span>ระบบตรวจสลิปกับธนาคารแล้ว ยอดตรงกับใบแจ้ง</span>
          </div>
        ) : (
          <div className="card pay">
            <div className="qr">
              <div className="qr__box" aria-hidden="true" />
              <div className="qr__t">
                <b>สแกนจ่าย PromptPay</b>
                <span>{accountName} ···{accountNo}</span>
              </div>
            </div>
            <button className="btn btn--cta btn--block" onClick={attach} disabled={step === 'checking'}>
              {step === 'checking' ? 'ระบบกำลังตรวจสลิป…' : 'แนบสลิป'}
            </button>
            {step === 'checking' && <p className="pay__wait">เทียบยอดกับรายการเดินบัญชี…</p>}
          </div>
        )}

        <p className="disclaimer">
          ผู้ปกครองไม่ต้องโหลดแอป — หน้านี้เปิดจากลิงก์ในแชท LINE ได้เลย
        </p>
      </div>
    </div>
  )
}
