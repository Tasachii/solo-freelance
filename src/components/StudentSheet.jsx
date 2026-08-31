import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { PROGRESS_NOTE, TYPE_LABEL, LIFE_LABEL } from '../data.js'
import { baht, billOf, recordsIn, rateOf } from '../state.js'
import { longMonth, shortDate, TH_DAY } from '../dates.js'

export default function StudentSheet({ student, state, period, onClose, onSendProgress, onEdit, onRemoveRecord }) {
  const [step, setStep] = useState('profile')
  const { times, amount, uniformRate, mixedRates } = billOf(student, state, period)
  const records = recordsIn(state, student.id, period)
  const tutor = state.settings.profile.publicName || state.settings.profile.name
  const MONTH = longMonth(period)

  if (step === 'progress') {
    const note = PROGRESS_NOTE[student.id] || `${student.nick}ตั้งใจเรียนดีมากครับ เดือนหน้าจะเน้นจุดที่ยังไม่แน่นให้ครับ`
    const text =
      `สวัสดีครับ ${student.parent}\n\n` +
      `สรุปการเรียนของ${student.nick} เดือน${MONTH} ครับ\n` +
      `เรียนไปทั้งหมด ${times} ครั้ง วิชา${student.subject}\n\n` +
      `${note}\n\n` +
      `ถ้ามีอะไรอยากให้ผมเน้นเป็นพิเศษ บอกได้เลยนะครับ\n${tutor}`

    return (
      <Sheet title="สรุปความคืบหน้า" sub={`ส่งถึง ${student.parent} ทาง LINE`} onClose={onClose}
        footer={
          <>
            <button className="btn btn--cta btn--block" onClick={() => onSendProgress(student, text)}>
              ส่งให้{student.parent}
            </button>
            <button className="reset" onClick={() => setStep('profile')}>← กลับไปหน้าโปรไฟล์</button>
          </>
        }>
        <div className="msg">{text}</div>
        <p className="hint"><span className="hint__ico">✎</span>
          <span>ระบบร่างให้ <b>แก้ก่อนส่งได้เสมอ</b> · มีเวลายกเลิก 6 วินาทีหลังกดส่ง</span></p>
      </Sheet>
    )
  }

  return (
    <Sheet
      title={student.nick}
      sub={`${student.grade} · ${student.subject} · ${TYPE_LABEL[student.type]} · ${student.parent}`}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--cta btn--block" onClick={() => setStep('progress')}>
            ส่งสรุปความคืบหน้าให้ผู้ปกครอง
          </button>
          <button className="btn btn--ghost btn--block" style={{ marginTop: 8 }} onClick={() => onEdit(student)}>
            แก้ไขข้อมูลและตารางเรียน
          </button>
        </>
      }
    >
      {student.life !== 'active' && <div className="notice">สถานะตอนนี้: <b>{LIFE_LABEL[student.life]}</b></div>}

      <div className="card" style={{ padding: '4px 14px' }}>
        <div className="kv">
          <span>เรทปัจจุบัน</span>
          <b>{baht(rateOf(student, state))} บาท{student.rate != null && <span className="kv__tag">เฉพาะคน</span>}</b>
        </div>
        <div className="kv"><span>เรียนไปแล้ว</span><b>{times}/{student.plan} ครั้ง</b></div>
        <div className="kv">
          <span>รวมต้องเก็บ</span>
          <b style={{ color: 'var(--cta)' }}>{baht(amount)} บาท</b>
        </div>
        {mixedRates && (
          <div className="kv"><span>หมายเหตุ</span><b style={{ fontWeight: 500 }}>เดือนนี้มีหลายเรท</b></div>
        )}
      </div>

      {(student.schedule || []).length > 0 && (
        <div className="block">
          <h4>ตารางเรียนประจำสัปดาห์</h4>
          <ul className="dates">
            {student.schedule.map((sl, i) => (
              <li key={i}>{TH_DAY[sl.day]} {sl.time}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="block">
        <h4>ประวัติเรียนเดือน{MONTH}</h4>
        {records.length === 0 ? (
          <p className="fld__hint">ยังไม่มีการเช็คชื่อเดือนนี้</p>
        ) : (
          <ul className="dates">
            {records.map((r) => (
              <li key={r.id} className={r.date === '2026-09-30' ? 'is-new' : ''}>
                {shortDate(r.date)}
                {mixedRates && <span className="dates__rate">{baht(r.rate)}</span>}
                <button className="dates__x" onClick={() => onRemoveRecord(student, r)}
                  aria-label={`ลบครั้งที่เรียนวันที่ ${shortDate(r.date)}`} title="ลบครั้งนี้ออก">✕</button>
              </li>
            ))}
          </ul>
        )}
        <p className="fld__hint" style={{ marginTop: 8 }}>กด ✕ เพื่อลบครั้งที่บันทึกผิด — ยอดเงินคำนวณใหม่ทันที</p>
      </div>
    </Sheet>
  )
}
