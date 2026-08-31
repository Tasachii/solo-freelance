import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { SelectField, TextField, EmptyState } from './Field.jsx'
import { baht, rateOf } from '../state.js'
import { TODAY } from '../data.js'

/** บันทึกคาบที่สอนไปแล้วแต่ลืมเช็ค — กันเงินรั่วย้อนหลัง */
export default function AddSessionSheet({ state, onClose, onAdd }) {
  const active = state.students.filter((s) => s.life === 'active')
  const [studentId, setStudentId] = useState(active[0]?.id ?? '')
  const [date, setDate] = useState(TODAY)
  const [err, setErr] = useState('')

  if (active.length === 0) {
    return (
      <Sheet title="บันทึกคาบย้อนหลัง" onClose={onClose}>
        <EmptyState icon="👋" title="ยังไม่มีนักเรียน" desc="เพิ่มนักเรียนก่อน แล้วค่อยบันทึกคาบย้อนหลังได้ครับ" />
      </Sheet>
    )
  }

  const student = state.students.find((s) => s.id === studentId)

  const submit = () => {
    if (!date.trim()) return setErr('ใส่วันที่ที่สอนด้วยครับ')
    onAdd({ studentId, date: date.trim() })
  }

  return (
    <Sheet
      title="บันทึกคาบที่ลืมเช็ค"
      sub="นับเข้าบิลเดือนนี้เหมือนเช็คชื่อปกติ"
      onClose={onClose}
      footer={
        <button className="btn btn--cta btn--block" onClick={submit}>
          บันทึก +{baht(student ? rateOf(student, state) : 0)} บาท
        </button>
      }
    >
      <SelectField
        label="นักเรียน"
        value={studentId}
        onChange={(e) => setStudentId(e.target.value)}
        options={active.map((s) => ({ value: s.id, label: `${s.nick} · ${s.subject} ${s.grade}` }))}
      />
      <TextField
        label="วันที่สอน"
        value={date}
        onChange={(e) => { setDate(e.target.value); setErr('') }}
        placeholder="เช่น 28 ก.ย."
        error={err}
        hint="พิมพ์วันที่แบบสั้นได้เลย ใช้แสดงในประวัติเรียน"
      />
      <p className="hint">
        <span className="hint__ico">⚠︎</span>
        <span>ใช้ตอน<b>สอนไปแล้วแต่ลืมกด</b> ไม่ใช่จองคาบล่วงหน้า</span>
      </p>
    </Sheet>
  )
}
