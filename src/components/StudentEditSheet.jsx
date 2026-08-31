import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { TextField, SelectField, Segmented } from './Field.jsx'
import { baht } from '../state.js'

const GRADES = ['ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6']
const SUBJECTS = ['คณิต', 'ฟิสิกส์', 'เคมี', 'ชีวะ', 'อังกฤษ', 'ไทย', 'สังคม']

export default function StudentEditSheet({ student, state, onClose, onSave, onDelete }) {
  const isNew = !student
  const [step, setStep] = useState('form')
  const [f, setF] = useState(() => ({
    nick: student?.nick ?? '',
    grade: student?.grade ?? 'ม.4',
    subject: student?.subject ?? 'คณิต',
    type: student?.type ?? 'single',
    parent: student?.parent ?? '',
    plan: String(student?.plan ?? 4),
    rate: student?.rate == null ? '' : String(student.rate),
    life: student?.life ?? 'active',
  }))
  const [err, setErr] = useState({})

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))
  const defaultRate = state.settings.rates[f.type]

  const submit = () => {
    const next = {}
    if (!f.nick.trim()) next.nick = 'ใส่ชื่อเล่นของนักเรียนด้วยครับ'
    const plan = Number(f.plan)
    if (!Number.isFinite(plan) || plan < 1 || plan > 31) next.plan = 'แผนต่อเดือนต้องอยู่ระหว่าง 1–31 ครั้ง'
    if (f.rate !== '' && (!Number.isFinite(Number(f.rate)) || Number(f.rate) < 0))
      next.rate = 'เรทต้องเป็นตัวเลขที่ไม่ติดลบ'
    setErr(next)
    if (Object.keys(next).length) return

    onSave({
      ...(student || {}),
      nick: f.nick.trim(),
      grade: f.grade,
      subject: f.subject,
      type: f.type,
      parent: f.parent.trim() || `ผู้ปกครอง${f.nick.trim()}`,
      plan,
      rate: f.rate === '' ? null : Number(f.rate),
      life: f.life,
    })
  }

  if (step === 'confirm') {
    return (
      <Sheet
        title={`ลบ ${student.nick}?`}
        sub="การลบนี้ย้อนกลับไม่ได้"
        onClose={onClose}
        footer={
          <>
            <button className="btn btn--danger btn--block" onClick={() => onDelete(student)}>
              ลบนักเรียนคนนี้
            </button>
            <button className="reset" onClick={() => setStep('form')}>ยกเลิก</button>
          </>
        }
      >
        <p className="msg">
          ประวัติเรียนและยอดค่าเรียนของ{student.nick}ในเดือนนี้จะหายไปทั้งหมด
          {'\n\n'}ถ้าแค่หยุดเรียนชั่วคราว แนะนำให้เปลี่ยนสถานะเป็น "พักชั่วคราว" แทน จะเก็บประวัติไว้ให้
        </p>
      </Sheet>
    )
  }

  return (
    <Sheet
      title={isNew ? 'เพิ่มนักเรียน' : `แก้ไข ${student.nick}`}
      sub={isNew ? 'กรอกเท่าที่รู้ตอนนี้ แก้ทีหลังได้เสมอ' : undefined}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--cta btn--block" onClick={submit}>
            {isNew ? 'เพิ่มนักเรียน' : 'บันทึกการแก้ไข'}
          </button>
          {!isNew && (
            <button className="reset reset--danger" onClick={() => setStep('confirm')}>
              ลบนักเรียนคนนี้
            </button>
          )}
        </>
      }
    >
      <TextField
        label="ชื่อเล่น"
        value={f.nick}
        onChange={set('nick')}
        placeholder="เช่น น้องพลอย"
        error={err.nick}
      />

      <div className="two">
        <SelectField label="ระดับชั้น" value={f.grade} onChange={set('grade')}
          options={GRADES.map((g) => ({ value: g, label: g }))} />
        <SelectField label="วิชา" value={f.subject} onChange={set('subject')}
          options={SUBJECTS.map((s) => ({ value: s, label: s }))} />
      </div>

      <Segmented
        label="ประเภทคาบ"
        value={f.type}
        onChange={(v) => setF((p) => ({ ...p, type: v }))}
        options={[
          { value: 'single', label: `เดี่ยว ${baht(state.settings.rates.single)}` },
          { value: 'group', label: `กลุ่ม ${baht(state.settings.rates.group)}` },
        ]}
      />

      <TextField label="ชื่อผู้ปกครอง" value={f.parent} onChange={set('parent')}
        placeholder="เช่น คุณแม่พลอย" hint="ใช้ขึ้นต้นข้อความที่ส่งเข้า LINE" />

      <div className="two">
        <TextField label="แผนต่อเดือน" type="number" inputMode="numeric" min="1" max="31"
          value={f.plan} onChange={set('plan')} suffix="ครั้ง" error={err.plan} />
        <TextField label="เรทเฉพาะคนนี้" type="number" inputMode="numeric" min="0"
          value={f.rate} onChange={set('rate')} suffix="บาท"
          placeholder={String(defaultRate)} error={err.rate}
          hint={f.rate === '' ? `ว่างไว้ = ใช้เรทกลาง ${baht(defaultRate)} บาท` : 'ใช้เรทพิเศษเฉพาะคนนี้'} />
      </div>

      <Segmented
        label="สถานะการเรียน"
        value={f.life}
        onChange={(v) => setF((p) => ({ ...p, life: v }))}
        options={[
          { value: 'active', label: 'กำลังเรียน' },
          { value: 'paused', label: 'พักชั่วคราว' },
          { value: 'ended', label: 'จบคอร์ส' },
        ]}
      />
    </Sheet>
  )
}
