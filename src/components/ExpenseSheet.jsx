import { useState } from 'react'
import Sheet from './Sheet.jsx'
import { TextField, SelectField } from './Field.jsx'
import { EXPENSE_CATEGORIES, TODAY } from '../data.js'

export default function ExpenseSheet({ expense, onClose, onSave, onDelete }) {
  const isNew = !expense
  const [f, setF] = useState(() => ({
    amount: expense ? String(expense.amount) : '',
    category: expense?.category ?? EXPENSE_CATEGORIES[0],
    note: expense?.note ?? '',
    date: expense?.date ?? TODAY,
  }))
  const [err, setErr] = useState({})

  const set = (k) => (e) => setF((p) => ({ ...p, [k]: e.target.value }))

  const submit = () => {
    const next = {}
    const amount = Number(f.amount)
    if (!f.amount.trim()) next.amount = 'ใส่จำนวนเงินด้วยครับ'
    else if (!Number.isFinite(amount) || amount <= 0) next.amount = 'จำนวนเงินต้องมากกว่า 0'
    if (!f.date.trim()) next.date = 'ใส่วันที่ด้วยครับ'
    setErr(next)
    if (Object.keys(next).length) return
    onSave({ ...(expense || {}), amount, category: f.category, note: f.note.trim(), date: f.date.trim() })
  }

  return (
    <Sheet
      title={isNew ? 'บันทึกรายจ่าย' : 'แก้ไขรายจ่าย'}
      sub="รายรับระบบคิดให้จากบิลอยู่แล้ว ตรงนี้ใส่แค่รายจ่าย"
      onClose={onClose}
      footer={
        <>
          <button className="btn btn--cta btn--block" onClick={submit}>
            {isNew ? 'บันทึกรายจ่าย' : 'บันทึกการแก้ไข'}
          </button>
          {!isNew && (
            <button className="reset reset--danger" onClick={() => onDelete(expense)}>
              ลบรายการนี้
            </button>
          )}
        </>
      }
    >
      <TextField
        label="จำนวนเงิน" type="number" inputMode="decimal" min="0"
        value={f.amount} onChange={set('amount')} suffix="บาท"
        placeholder="0" error={err.amount} autoFocus
      />
      <SelectField
        label="หมวด" value={f.category} onChange={set('category')}
        options={EXPENSE_CATEGORIES.map((c) => ({ value: c, label: c }))}
      />
      <TextField label="วันที่" type="date" value={f.date} onChange={set('date')} error={err.date} />
      <TextField label="โน้ต" value={f.note} onChange={set('note')} placeholder="เช่น ค่าแท็กซี่ไปบ้านนักเรียน" />
    </Sheet>
  )
}
