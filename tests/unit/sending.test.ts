import { describe, expect, it } from 'vitest'
import { reducer } from '../../src/core/store'
import { buildScenario } from '../../src/core/scenarios'
import { receiptOfInvoice } from '../../src/core/receipts'
import { todayISO } from '../../src/core/format'

const base = () => reducer(buildScenario('default'), { type: 'track', name: 'init' })

describe('คิวส่ง LINE รอดข้ามการสลับแอป', () => {
  it('คิวถูกเก็บใน state จึงยังอยู่หลังกลับมาจาก LINE', () => {
    const s = base()
    const ids = s.messages.filter((m) => m.status === 'draft').map((m) => m.id)
    const after = reducer(s, { type: 'sendingStart', awaiting: ids[0], queue: ids.slice(1) })
    expect(after.sending).toEqual({ awaiting: ids[0], queue: ids.slice(1) })

    // จำลองปิดแอปแล้วเปิดใหม่ — state ถูก persist ทั้งก้อน
    const reopened = JSON.parse(JSON.stringify(after))
    expect(reopened.sending.awaiting).toBe(ids[0])
  })

  it('ยืนยันส่งแล้วเดินคิวต่อได้ และหยุดคิวล้างค่าทิ้ง', () => {
    let s = base()
    const ids = s.messages.filter((m) => m.status === 'draft').map((m) => m.id)
    s = reducer(s, { type: 'sendingStart', awaiting: ids[0], queue: ids.slice(1) })
    s = reducer(s, { type: 'sendingNext', awaiting: ids[1] })
    expect(s.sending).toEqual({ awaiting: ids[1], queue: ids.slice(2) })
    s = reducer(s, { type: 'sendingStop' })
    expect(s.sending).toBeUndefined()
  })
})

describe('วันเดินข้ามเที่ยงคืน', () => {
  it('setToday เดินวันได้ในโหมดจริง', () => {
    const real = { ...base(), mode: 'real' as const, today: '2026-01-01' }
    expect(reducer(real, { type: 'setToday', date: todayISO() }).today).toBe(todayISO())
  })
})

describe('ใบเสร็จของบิลที่จ่ายเป็นงวด', () => {
  it('บอกยอดบิล ไม่ใช่ยอดงวดสุดท้าย และหาใบเสร็จเจอ', () => {
    let s = base()
    const inv = s.invoices.find((i) => i.status === 'sent' || i.status === 'overdue')!
    s = reducer(s, { type: 'recordPayment', invoiceId: inv.id, amount: 1000, slipVerified: true })
    expect(receiptOfInvoice(s, inv.id)).toBeUndefined() // ยังไม่ครบ ยังไม่ออกใบเสร็จ

    s = reducer(s, { type: 'recordPayment', invoiceId: inv.id, amount: inv.total - 1000, slipVerified: true })
    const rc = receiptOfInvoice(s, inv.id)
    expect(rc).toBeTruthy() // ต้องหาเจอแม้ใบเสร็จห้อยกับ payment ตัวที่สอง

    const draft = s.messages.find((m) => m.kind === 'receipt' && m.meta?.receiptId === rc!.id)!
    expect(draft.draft).toContain(inv.total.toLocaleString('th-TH'))
  })
})
