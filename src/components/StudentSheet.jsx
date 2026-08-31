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
            <button
              className="btn btn--cta btn--block"
              onClick={() => onSendProgress(student)}
            >
              ส่งให้{student.parent}
            </button>
            <button
              className="reset"
              onClick={() => setStep('profile')}
              style={{ marginTop: 12 }}
            >
              ← กลับไปหน้าโปรไฟล์
            </button>
          </>
        }
      >
        <div className="msg msg--quote">{text}</div>
        <div className="hint" style={{ marginLeft: 0, marginRight: 0 }}>
          <span className="hint__ico">✎</span>
          <span>
            ระบบร่างให้จากสิ่งที่คุณบันทึกไว้ <b>แก้ก่อนส่งได้เสมอ</b> —
            เพราะผู้ปกครองต้องรู้สึกว่าครูเป็นคนเขียน ไม่ใช่หุ่นยนต์
          </span>
        </div>
        <p className="disclaimer">เดโม · ข้อมูลสมมติทั้งหมด</p>
      </Sheet>
    )
  }

  return (
    <Sheet
      title={student.nick}
      sub={`${student.grade} · ${student.subject} · ${TYPE_LABEL[student.type]}`}
      onClose={onClose}
      footer={
        <button className="btn btn--ink btn--block" onClick={() => setStep('progress')}>
          ส่งสรุปความคืบหน้าให้ผู้ปกครอง
        </button>
      }
    >
      <div className="card" style={{ padding: '13px 14px', display: 'flex', gap: 12, alignItems: 'center' }}>
        <span className={`av av--${state.status[student.id]}`}>{initialOf(student.nick)}</span>
        <span style={{ minWidth: 0 }}>
          <span className="stu__name" style={{ display: 'block' }}>{student.parent}</span>
          <span className="stu__meta" style={{ display: 'block' }}>ผู้ปกครอง · แจ้งบิลทาง LINE</span>
        </span>
      </div>

      <div className="block">
        <h4>ค่าเรียนเดือนนี้</h4>
        <div className="card" style={{ padding: '4px 14px' }}>
          <div className="kv">
            <span>เรทต่อครั้ง</span>
            <b>{baht(rate)} บาท</b>
          </div>
          <div className="kv">
            <span>เรียนไปแล้ว</span>
            <b>
              {times} ครั้ง <span style={{ fontWeight: 400 }}>(แผน {student.plan})</span>
            </b>
          </div>
          <div className="kv">
            <span>รวมต้องเก็บ</span>
            <b style={{ color: 'var(--cta)' }}>{baht(amount)} บาท</b>
          </div>
        </div>
      </div>

      <div className="block">
        <h4>ประวัติเรียนเดือน{TUTOR.month}</h4>
        <ul className="dates">
          {dates.map((d, i) => (
            <li key={i} className={d === 'วันนี้' ? 'is-new' : ''}>
              {d}
            </li>
          ))}
        </ul>
      </div>

      <div className="hint" style={{ marginLeft: 0, marginRight: 0 }}>
        <span className="hint__ico">♡</span>
        <span>
          สรุปพัฒนาการรายเดือนคือเหตุผลที่ผู้ปกครอง<b>รู้สึกคุ้มและจ่ายต่อ</b> —
          ใช้เวลาคุณ 10 วินาที แต่ทำให้เขาเห็นว่าเงินที่จ่ายไปได้อะไรกลับมา
        </span>
      </div>

      <p className="disclaimer">เดโม · ข้อมูลสมมติทั้งหมด</p>
    </Sheet>
  )
}
