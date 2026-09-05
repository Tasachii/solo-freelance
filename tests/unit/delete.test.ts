import { describe, expect, it } from 'vitest'
import { reducer } from '../../src/core/store'
import { buildScenario } from '../../src/core/scenarios'

const s0 = () => buildScenario('default')

describe('ลบคนออก', () => {
  it('โหมดจริงที่มีบิลต้อง archive และรักษาประวัติการเงิน', () => {
    const before = { ...s0(), mode: 'real' as const }
    const invoices = before.invoices.filter((i) => i.subjectId === 's2').map((i) => i.id)
    const after = reducer(before, { type: 'deleteSubject', subjectId: 's2' })
    expect(after.subjects.find((x) => x.id === 's2')?.active).toBe(false)
    expect(after.invoices.filter((i) => invoices.includes(i.id))).toHaveLength(invoices.length)
  })
  it('ลบแล้วไม่เหลือแถวกำพร้าที่ทำหน้าจอพัง', () => {
    const before = s0()
    const sub = before.subjects.find((x) => x.id === 's2')!
    const invIds = before.invoices.filter((i) => i.subjectId === 's2').map((i) => i.id)
    expect(invIds.length).toBeGreaterThan(0)

    const s = reducer(before, { type: 'deleteSubject', subjectId: 's2' })

    expect(s.subjects.some((x) => x.id === 's2')).toBe(false)
    expect(s.units.some((u) => u.subjectId === 's2')).toBe(false)
    expect(s.invoices.some((i) => i.subjectId === 's2')).toBe(false)
    expect(s.messages.some((m) => m.subjectId === 's2')).toBe(false)
    // ทุก completion ต้องยังชี้ไปยัง unit ที่มีจริง
    const unitIds = new Set(s.units.map((u) => u.id))
    expect(s.completions.every((c) => unitIds.has(c.unitId))).toBe(true)
    // ทุก payment ต้องยังชี้ไปยังบิลที่มีจริง
    const okInv = new Set(s.invoices.map((i) => i.id))
    expect(s.payments.every((p) => okInv.has(p.invoiceId))).toBe(true)
    // ทุกใบเสร็จต้องยังชี้ไปยัง payment ที่มีจริง
    const okPay = new Set(s.payments.map((p) => p.id))
    expect(s.receipts.every((r) => okPay.has(r.paymentId))).toBe(true)
    expect(sub.clientId).toBeTruthy()
  })

  it('ลบคนที่จ่ายเงินแล้ว ใบเสร็จต้องไม่ค้างเป็นแถวกำพร้า', () => {
    let s = s0()
    const inv = s.invoices.find((i) => i.subjectId === 's2' && i.status !== 'paid')!
    s = reducer(s, { type: 'recordPayment', invoiceId: inv.id, amount: inv.total, slipVerified: true })
    const rc = s.receipts.filter((r) => s.payments.some((p) => p.id === r.paymentId && p.invoiceId === inv.id))
    expect(rc.length).toBe(1) // มีใบเสร็จให้กำพร้าจริง

    s = reducer(s, { type: 'deleteSubject', subjectId: 's2' })
    const okPay = new Set(s.payments.map((p) => p.id))
    expect(s.receipts.every((r) => okPay.has(r.paymentId))).toBe(true)
    expect(s.receipts.some((r) => r.id === rc[0].id)).toBe(false)
  })

  it('ผู้จ่ายที่ไม่เหลือคนเรียนแล้ว ถูกลบไปด้วย', () => {
    const s = reducer(s0(), { type: 'deleteSubject', subjectId: 's2' })
    expect(s.clients.some((c) => c.id === 'c2')).toBe(false)
  })

  it('ผู้จ่ายที่ยังมีลูกอีกคน ต้องไม่ถูกลบ', () => {
    // c4 มีทั้ง s4 และ s5
    const s = reducer(s0(), { type: 'deleteSubject', subjectId: 's4' })
    expect(s.clients.some((c) => c.id === 'c4')).toBe(true)
    expect(s.subjects.some((x) => x.id === 's5')).toBe(true)
  })

  it('คนอื่นไม่ถูกแตะ', () => {
    const before = s0()
    const s = reducer(before, { type: 'deleteSubject', subjectId: 's2' })
    expect(s.subjects).toHaveLength(before.subjects.length - 1)
    expect(s.subjects.some((x) => x.id === 's1')).toBe(true)
  })
})
