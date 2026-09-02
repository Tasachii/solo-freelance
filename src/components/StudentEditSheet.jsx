import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { TextField, SelectField, Segmented } from './Field.jsx'
import { baht, billingOf } from '../state.js'
import { TH_DAY } from '../dates.js'

const GRADES = ['ป.6', 'ม.1', 'ม.2', 'ม.3', 'ม.4', 'ม.5', 'ม.6']
const SUBJECTS = ['คณิต', 'ฟิสิกส์', 'เคมี', 'ชีวะ', 'อังกฤษ', 'ไทย', 'สังคม']

export default function StudentEditSheet({ student, state, onClose, onSave, onDelete }) {
  const isNew = !student
  const [step, setStep] = useState('form')
  const b = student ? billingOf(student, state) : null
  const [f, setF] = useState(() => ({
    nick: student?.nick ?? '',
    grade: student?.grade ?? 'ม.4',
    subject: student?.subject ?? 'คณิต',
    type: student?.type ?? 'single',
    parent: student?.parent ?? '',
    plan: String(student?.plan ?? 4),
    life: student?.life ?? 'active',
    schedule: student?.schedule ? [...student.schedule] : [{ day: 3, time: '17:00' }],
    mode: b?.mode ?? 'per_session',
    rate: String(b?.rate ?? state.settings.rates[student?.type ?? 'single'] ?? 400),
    flatAmount: String(b?.amount ?? 3000),
    packTotal: String(b?.total ?? 10),
    packPrice: String(b?.price ?? 3500),
  }))
  const [err, setErr] = useState({})

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))
  const setSlot = (i, patch) =>
    setF((p) => ({ ...p, schedule: p.schedule.map((s, j) => (j === i ? { ...s, ...patch } : s)) }))
  const addSlot = () => setF((p) => ({ ...p, schedule: [...p.schedule, { day: 1, time: '17:00' }] }))
  const removeSlot = (i) => setF((p) => ({ ...p, schedule: p.schedule.filter((_, j) => j !== i) }))

  const submit = () => {
    const next = {}
    if (!f.nick.trim()) next.nick = 'ใส่ชื่อเล่นของนักเรียนด้วยครับ'
    const plan = Number(f.plan)
    if (!Number.isFinite(plan) || plan < 1 || plan > 31) next.plan = 'แผนต่อเดือนต้องอยู่ระหว่าง 1–31 ครั้ง'
    const pos = (v) => Number.isFinite(Number(v)) && Number(v) > 0
    if (f.mode === 'per_session' && !pos(f.rate)) next.rate = 'ใส่เรทต่อครั้งเป็นตัวเลขมากกว่า 0'
    if (f.mode === 'monthly_flat' && !pos(f.flatAmount)) next.flatAmount = 'ใส่ยอดเหมาต่อเดือน'
    if (f.mode === 'package' && (!pos(f.packTotal) || !pos(f.packPrice))) next.packTotal = 'ใส่จำนวนครั้งและราคาแพ็ก'
    setErr(next)
    if (Object.keys(next).length) return

    const billing =
      f.mode === 'per_session' ? { mode: 'per_session', rate: Number(f.rate) }
      : f.mode === 'monthly_flat' ? { mode: 'monthly_flat', amount: Number(f.flatAmount) }
      : { mode: 'package', total: Number(f.packTotal), price: Number(f.packPrice),
          // แก้ไขคนเดิม: เก็บจำนวนที่ใช้ไปแล้ว ไม่รีเซ็ตตัวนับ
          used: b?.mode === 'package' ? b.used : 0,
          purchasedAt: b?.purchasedAt ?? null }

    onSave({
      ...(student || {}),
      nick: f.nick.trim(), grade: f.grade, subject: f.subject, type: f.type,
      parent: f.parent.trim() || `ผู้ปกครอง${f.nick.trim()}`,
      plan, life: f.life, schedule: f.schedule, billing,
    })
  }

  if (step === 'confirm') {
    return (
      <Sheet title={`ลบ ${student.nick}?`} sub="การลบนี้ย้อนกลับได้ผ่านประวัติการแก้ไข" onClose={onClose}
        footer={
          <>
            <button className="btn btn--danger btn--block" onClick={() => onDelete(student)}>ลบนักเรียนคนนี้</button>
            <button className="reset" onClick={() => setStep('form')}>ยกเลิก</button>
          </>
        }>
        <p className="msg">
          ประวัติเรียนและยอดค่าเรียนของ{student.nick}จะถูกลบทั้งหมด
          {'\n\n'}ถ้าแค่หยุดเรียนชั่วคราว แนะนำให้เปลี่ยนสถานะเป็น "พักชั่วคราว" แทน จะเก็บประวัติไว้ให้
        </p>
      </Sheet>
    )
  }

  return (
    <Sheet
      title={isNew ? 'เพิ่มนักเรียน' : `แก้ไข ${student.nick}`}
      sub={isNew ? 'ตั้งวันเรียนไว้ แล้วชื่อจะโผล่ในแท็บวันนี้เอง' : undefined}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--cta btn--block" onClick={submit}>
            {isNew ? 'เพิ่มนักเรียน' : 'บันทึกการแก้ไข'}
          </button>
          {!isNew && <button className="reset reset--danger" onClick={() => setStep('confirm')}>ลบนักเรียนคนนี้</button>}
        </>
      }
    >
      <TextField label="ชื่อเล่น" value={f.nick} onChange={set('nick')} placeholder="เช่น น้องพลอย" error={err.nick} />

      <div className="two">
        <SelectField label="ระดับชั้น" value={f.grade} onChange={set('grade')} options={GRADES.map((g) => ({ value: g, label: g }))} />
        <SelectField label="วิชา" value={f.subject} onChange={set('subject')} options={SUBJECTS.map((s) => ({ value: s, label: s }))} />
      </div>

      <Segmented label="โหมดการจ่าย" value={f.mode} onChange={(v) => setF((p) => ({ ...p, mode: v }))}
        options={[
          { value: 'per_session', label: 'รายครั้ง' },
          { value: 'monthly_flat', label: 'เหมา/เดือน' },
          { value: 'package', label: 'แพ็ก' },
        ]}
        hint={b && b.mode !== f.mode
          ? 'เปลี่ยนโหมดมีผลกับครั้งถัดไป — ครั้งที่บันทึกไว้แล้วคิดตามโหมดเดิม'
          : f.mode === 'per_session' ? 'สิ้นเดือนคิดตามครั้งที่เรียนจริง'
          : f.mode === 'monthly_flat' ? 'จ่ายเท่ากันทุกเดือน เรียนกี่ครั้งก็ได้'
          : 'จ่ายล่วงหน้าเป็นก้อน ระบบนับให้ว่าเหลือกี่ครั้ง'} />

      {f.mode === 'per_session' && (
        <TextField label="เรทต่อครั้ง" type="number" inputMode="numeric" min="0"
          value={f.rate} onChange={set('rate')} suffix="บาท" error={err.rate} />
      )}
      {f.mode === 'monthly_flat' && (
        <TextField label="ยอดเหมาต่อเดือน" type="number" inputMode="numeric" min="0"
          value={f.flatAmount} onChange={set('flatAmount')} suffix="บาท" error={err.flatAmount} />
      )}
      {f.mode === 'package' && (
        <div className="two">
          <TextField label="แพ็กกี่ครั้ง" type="number" inputMode="numeric" min="1"
            value={f.packTotal} onChange={set('packTotal')} suffix="ครั้ง" error={err.packTotal} />
          <TextField label="ราคาแพ็ก" type="number" inputMode="numeric" min="0"
            value={f.packPrice} onChange={set('packPrice')} suffix="บาท"
            hint={Number(f.packTotal) > 0 ? `ตกครั้งละ ${baht(Number(f.packPrice) / Number(f.packTotal))} บาท` : undefined} />
        </div>
      )}

      <div className="fld">
        <div className="fld__label">ตารางเรียนประจำสัปดาห์</div>
        {f.schedule.length === 0 && (
          <p className="fld__hint" style={{ marginTop: 0, marginBottom: 8 }}>
            ยังไม่ได้ตั้งวันเรียน — จะไม่ขึ้นในแท็บ "วันนี้" แต่บันทึกคาบย้อนหลังได้
          </p>
        )}
        {f.schedule.map((sl, i) => (
          <div className="schedrow" key={i}>
            <select className="fld__input fld__input--select" value={sl.day} aria-label="วัน"
              onChange={(e) => setSlot(i, { day: Number(e.target.value) })}>
              {TH_DAY.map((d, idx) => <option key={d} value={idx}>{d}</option>)}
            </select>
            <input className="fld__input" type="time" value={sl.time} aria-label="เวลา"
              onChange={(e) => setSlot(i, { time: e.target.value })} />
            <button className="schedrow__x" onClick={() => removeSlot(i)} aria-label={`ลบวัน${TH_DAY[sl.day]}`}>✕</button>
          </div>
        ))}
        <button className="btn btn--ghost btn--sm" style={{ marginTop: 8 }} onClick={addSlot}>+ เพิ่มวันเรียน</button>
      </div>

      <TextField label="ชื่อผู้ปกครอง" value={f.parent} onChange={set('parent')}
        placeholder="เช่น คุณแม่พลอย" hint="ใช้ขึ้นต้นข้อความที่ส่งเข้า LINE" />

      <TextField label="แผนต่อเดือน" type="number" inputMode="numeric" min="1" max="31"
        value={f.plan} onChange={set('plan')} suffix="ครั้ง" error={err.plan}
        hint="ใช้เตือนเมื่อเรียนต่ำกว่าแผน" />

      <Segmented label="สถานะการเรียน" value={f.life} onChange={(v) => setF((p) => ({ ...p, life: v }))}
        options={[
          { value: 'active', label: 'กำลังเรียน' },
          { value: 'paused', label: 'พักชั่วคราว' },
          { value: 'ended', label: 'จบคอร์ส' },
        ]} />
    </Sheet>
  )
}
