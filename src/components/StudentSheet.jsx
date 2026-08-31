import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { HISTORY, PROGRESS_NOTE, TUTOR, TYPE_LABEL } from '../data.js'
import { baht, billOf, initialOf } from '../state.js'

export default function StudentSheet({ student, state, onClose, onSendProgress }) {
  const [step, setStep] = useState('profile')
  const { times, rate, amount } = billOf(student, state)

  const base = HISTORY[student.id] || []
  const extra = Math.max(0, times - base.length)
  const dates = [...base.slice(0, times), ...Array(extra).fill('วันนี้')]

  if (step === 'progress') {
    const text =
      `สวัสดีครับ ${student.parent}\n\n` +
      `สรุปการเรียนของ${student.nick} เดือน${TUTOR.month} ครับ\n` +
      `เรียนไปทั้งหมด ${times} ครั้ง วิชา${student.subject}\n\n` +
      `${PROGRESS_NOTE[student.id]}\n\n` +
      `ถ้ามีอะไรอยากให้ผมเน้นเป็นพิเศษ บอกได้เลยนะครับ\n${TUTOR.name}`

    return (
      <Sheet
        title="สรุปความคืบหน้า"
        sub={`ส่งถึง ${student.parent} ทาง LINE`}
        onClose={onClose}
        footer={
          <>
            <button className="btn btn--cta btn--block" onClick={() => onSendProgress(student)}>
              ส่งให้{student.parent}
            </button>
            <button className="reset" onClick={() => setStep('profile')}>
              ← กลับไปหน้าโปรไฟล์
            </button>
          </>
        }
      >
        <div className="msg">{text}</div>
        <p className="hint">
          <span className="hint__ico">✎</span>
          <span>ระบบร่างให้ <b>แก้ก่อนส่งได้เสมอ</b></span>
        </p>
      </Sheet>
    )
  }

  return (
    <Sheet
      title={student.nick}
      sub={`${student.grade} · ${student.subject} · ${TYPE_LABEL[student.type]} · ${student.parent}`}
      onClose={onClose}
      footer={
        <button className="btn btn--ink btn--block" onClick={() => setStep('progress')}>
          ส่งสรุปความคืบหน้าให้ผู้ปกครอง
        </button>
      }
    >
      <div className="card" style={{ padding: '4px 14px' }}>
        <div className="kv"><span>เรทต่อครั้ง</span><b>{baht(rate)} บาท</b></div>
        <div className="kv"><span>เรียนไปแล้ว</span><b>{times}/{student.plan} ครั้ง</b></div>
        <div className="kv"><span>รวมต้องเก็บ</span><b style={{ color: 'var(--cta)' }}>{baht(amount)} บาท</b></div>
      </div>

      <div className="block">
        <h4>ประวัติเรียนเดือนนี้</h4>
        <ul className="dates">
          {dates.map((d, i) => (
            <li key={i} className={d === 'วันนี้' ? 'is-new' : ''}>{d}</li>
          ))}
        </ul>
      </div>

      <p className="hint">
        <span className="hint__ico">♡</span>
        <span>สรุปพัฒนาการคือเหตุผลที่ผู้ปกครอง<b>จ่ายต่อโดยไม่ต้องถาม</b></span>
      </p>
    </Sheet>
  )
}
