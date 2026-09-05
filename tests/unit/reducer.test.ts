import { describe, expect, it } from 'vitest'
import { reducer } from '../../src/core/store'
import { buildScenario } from '../../src/core/scenarios'
import type { AppState, Invoice } from '../../src/core/types'
import { balanceDue, paidAmount } from '../../src/core/ledger'
import { packageStatus } from '../../src/core/ledger'

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
    expect(paidAmount(s, inv.id)).toBe(inv.total)
    expect(balanceDue(s, inv.id)).toBe(0)
  })

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('ปฏิเสธยอดเงินผิดรูป %s', (amount) => {
    const s0 = buildScenario('default')
    const inv = sentInvoice(s0)
    expect(reducer(s0, { type: 'recordPayment', invoiceId: inv.id, amount, slipVerified: true })).toBe(s0)
  })

  it('ปฏิเสธยอดที่เกินยอดคงเหลือ', () => {
    const s0 = buildScenario('default')
    const inv = sentInvoice(s0)
    expect(reducer(s0, { type: 'recordPayment', invoiceId: inv.id, amount: inv.total + 1, slipVerified: true })).toBe(s0)
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

describe('reducer · input boundary', () => {
  it('โหมดจริงส่งข้อความการเงินไม่ได้ถ้ายังไม่มีปลายทางรับเงินที่ถูกต้อง', () => {
    const base = buildScenario('default')
    const message = { ...base.messages[0], id: 'financial', kind: 'invoice' as const, status: 'draft' as const }
    const state = { ...base, mode: 'real' as const, provider: { name: 'ผู้สอน', promptpayId: '' }, messages: [message] }
    expect(reducer(state, { type: 'sendMessage', id: message.id })).toBe(state)
  })
  it('ปฏิเสธสถานะตรวจสลิปที่ไม่ใช่ boolean', () => {
    const state = buildScenario('default')
    const invoice = sentInvoice(state)
    expect(reducer(state, { type: 'recordPayment', invoiceId: invoice.id, amount: 1, slipVerified: 'yes' as any })).toBe(state)
  })

  it('ต่อแพ็กให้รายการที่หยุดใช้งานแล้วไม่ได้', () => {
    const state = buildScenario('default')
    const inactive = { ...state, subjects: state.subjects.map((subject) =>
      subject.id === 's6' ? { ...subject, active: false } : subject) }
    expect(reducer(inactive, { type: 'renewPackage', subjectId: 's6' })).toBe(inactive)
  })
  it('ปฏิเสธวันและเวลาที่ไม่ใช่รูปแบบจริง', () => {
    const s0 = buildScenario('default')
    const unit = s0.units[0]
    expect(reducer(s0, { type: 'rescheduleUnit', unitId: unit.id, date: '2025-02-30', time: '25:99' })).toBe(s0)
    expect(reducer(s0, { type: 'setToday', date: 'not-a-date' })).toBe(s0)
  })

  it('แก้แพ็กต้องรักษา epoch และ carriedUnitIds เดิม', () => {
    const s0 = buildScenario('default')
    const old = s0.subjects.find((x) => x.id === 's6')!
    if (old.billing.mode !== 'package') throw new Error('fixture')
    const before = { ...s0, subjects: s0.subjects.map((x) => x.id === old.id
      ? { ...x, billing: { ...old.billing, carriedUnitIds: ['old-unit'] } }
      : x) }
    const packageBefore = packageStatus(before, before.subjects.find((x) => x.id === old.id)!)
    const edited = { ...old, billing: { mode: 'package' as const, total: old.billing.total, price: 4200, purchasedAt: '2099-01-01' } }
    const after = reducer(before, { type: 'upsertSubject', subject: edited, clientName: 'ผู้จ่าย' })
    const saved = after.subjects.find((x) => x.id === old.id)!.billing
    expect(saved).toMatchObject({ purchasedAt: old.billing.purchasedAt, carriedUnitIds: ['old-unit'] })
    expect(packageStatus(after, after.subjects.find((x) => x.id === old.id)!)).toMatchObject({
      used: packageBefore!.used, remaining: packageBefore!.remaining,
    })
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
