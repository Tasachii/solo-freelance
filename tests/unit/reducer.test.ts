import { describe, expect, it } from 'vitest'
import { reducer } from '../../src/core/store'
import { buildScenario } from '../../src/core/scenarios'
import type { AppState, Invoice } from '../../src/core/types'

const sentInvoice = (s: AppState): Invoice =>
  s.invoices.find((i) => i.status === 'sent' || i.status === 'overdue')!

describe('reducer · recordPayment', () => {
  it('กดยืนยันซ้ำไม่ออกใบเสร็จใบที่สอง', () => {
    const s0 = buildScenario('default')
    const inv = sentInvoice(s0)
    const pay = { type: 'recordPayment' as const, invoiceId: inv.id, amount: inv.total, slipVerified: true }

    const once = reducer(s0, pay)
    const twice = reducer(once, pay)

    expect(once.payments.length).toBe(s0.payments.length + 1)
    expect(once.receipts.length).toBe(s0.receipts.length + 1)
    expect(twice.payments.length).toBe(once.payments.length)
    expect(twice.receipts.length).toBe(once.receipts.length)
  })

  it('จ่ายไม่ครบยังไม่ปิดบิล และยอดค้างไม่หายไปทั้งก้อน', () => {
    const s0 = buildScenario('default')
    const inv = sentInvoice(s0)
    const partial = reducer(s0, {
      type: 'recordPayment', invoiceId: inv.id, amount: inv.total - 1000, slipVerified: true,
    })

    const after = partial.invoices.find((i) => i.id === inv.id)!
    expect(after.status).not.toBe('paid')
    expect(partial.receipts.length).toBe(s0.receipts.length) // ยังไม่ออกใบเสร็จ
  })

  it('จ่ายเป็นงวดจนครบจึงปิดบิลและออกใบเสร็จ', () => {
    const s0 = buildScenario('default')
    const inv = sentInvoice(s0)
    let s = reducer(s0, { type: 'recordPayment', invoiceId: inv.id, amount: 1000, slipVerified: true })
    s = reducer(s, { type: 'recordPayment', invoiceId: inv.id, amount: inv.total - 1000, slipVerified: true })

    expect(s.invoices.find((i) => i.id === inv.id)!.status).toBe('paid')
    expect(s.receipts.length).toBe(s0.receipts.length + 1)
  })

  it('ยอดสลิปที่อ่านได้ 0 ต้องถูกบันทึก ไม่ใช่ถูกทิ้ง', () => {
    const s0 = buildScenario('default')
    const inv = sentInvoice(s0)
    const s = reducer(s0, {
      type: 'recordPayment', invoiceId: inv.id, amount: inv.total, slipVerified: false, slipAmount: 0,
    })
    expect(s.payments.at(-1)!.slipAmount).toBe(0)
  })
})

describe('reducer · clearMessages', () => {
  it('ล้างข้อความแล้วร่างที่ข้ามไปต้องไม่ฟื้น', () => {
    // ร่างเกิดตอน normalize ซึ่งวิ่งท้ายทุก action — ยิง track ให้ state ตั้งตัวก่อน
    let s = reducer(buildScenario('default'), { type: 'track', name: 'test' })
    const first = s.messages.find((m) => m.status === 'draft')!
    s = reducer(s, { type: 'skipMessage', id: first.id })
    expect(s.messages.find((m) => m.id === first.id)!.status).toBe('skipped')

    s = reducer(s, { type: 'clearMessages' })
    const same = s.messages.filter((m) => m.dedupeKey === first.dedupeKey)
    expect(same).toHaveLength(1)
    expect(same[0].status).toBe('skipped')
  })
})
