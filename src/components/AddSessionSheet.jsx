import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { SelectField, TextField, Segmented, EmptyState } from './Field.jsx'
import { baht, rateOf, billingOf } from '../state.js'
import { TODAY } from '../data.js'

/** เพิ่มคาบพิเศษของวันนี้ หรือบันทึกคาบที่สอนไปแล้วแต่ลืมกด */
export default function AddSessionSheet({ state, onClose, onAddToday, onAddPast }) {
  const active = state.students.filter((s) => s.life === 'active')
  const [mode, setMode] = useState('past')
  const [studentId, setStudentId] = useState(active[0]?.id ?? '')
  const [date, setDate] = useState(TODAY)
  const [time, setTime] = useState('17:00')
  const [err, setErr] = useState('')

  if (active.length === 0) {
    return (
      <Sheet title="เพิ่มคาบเรียน" onClose={onClose}>
        <EmptyState icon="👋" title="ยังไม่มีนักเรียน" desc="เพิ่มนักเรียนก่อน แล้วค่อยเพิ่มคาบได้ครับ" />
      </Sheet>
    )
  }

  const student = state.students.find((s) => s.id === studentId)

  const submit = () => {
    if (mode === 'today') return onAddToday({ studentId, time })
    if (!date) return setErr('เลือกวันที่ที่สอนด้วยครับ')
    if (date > TODAY) return setErr('บันทึกย้อนหลังได้เฉพาะวันที่ผ่านมาแล้ว')
    onAddPast({ studentId, date })
  }

  return (
    <Sheet
      title="เพิ่มคาบเรียน"
      sub={mode === 'today' ? 'คาบพิเศษที่ยังไม่ได้สอน' : 'สอนไปแล้วแต่ลืมเช็คชื่อ'}
      onClose={onClose}
      footer={
        <button className="btn btn--cta btn--block" onClick={submit}>
          {mode === 'today'
            ? 'เพิ่มเข้าตารางวันนี้'
            : (() => {
                const mode = student ? billingOf(student, state).mode : 'per_session'
                if (mode === 'monthly_flat') return 'บันทึก (เหมารายเดือน ไม่กระทบบิล)'
                if (mode === 'package') return 'บันทึก · ใช้สิทธิ์แพ็ก 1 ครั้ง'
                return `บันทึก +${baht(student ? rateOf(student, state) : 0)} บาท`
              })()}
        </button>
      }
    >
      <Segmented
        value={mode}
        onChange={(v) => { setMode(v); setErr('') }}
        options={[
          { value: 'past', label: 'ลืมเช็คชื่อ' },
          { value: 'today', label: 'คาบพิเศษวันนี้' },
        ]}
      />

      <SelectField label="นักเรียน" value={studentId} onChange={(e) => setStudentId(e.target.value)}
        options={active.map((s) => ({ value: s.id, label: `${s.nick} · ${s.subject} ${s.grade}` }))} />

      {mode === 'today' ? (
        <TextField label="เวลา" type="time" value={time} onChange={(e) => setTime(e.target.value)}
          hint="เพิ่มเข้าตารางวันนี้แล้วค่อยกดเช็คชื่อตามปกติ" />
      ) : (
        <TextField label="วันที่สอน" type="date" value={date} max={TODAY}
          onChange={(e) => { setDate(e.target.value); setErr('') }} error={err}
          hint="นับเข้าบิลทันทีเหมือนเช็คชื่อปกติ" />
      )}

      <p className="hint">
        <span className="hint__ico">{mode === 'today' ? '＋' : '⚠︎'}</span>
        <span>
          {mode === 'today'
            ? 'คาบพิเศษไม่กระทบตารางประจำสัปดาห์'
            : <>ใช้ตอน<b>สอนไปแล้วแต่ลืมกด</b> ไม่ใช่จองล่วงหน้า</>}
        </span>
      </p>
    </Sheet>
  )
}
