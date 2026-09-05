import { describe, expect, it } from 'vitest'
import { buildScenario } from '../../src/core/scenarios'
import { reducer } from '../../src/core/store'
import { dashboard, invoiceToActOn } from '../../src/core/selectors'
import { complete, unitsOn } from '../../src/core/ledger'
import { closableSubjects } from '../../src/core/billing'

describe('selectors', () => {
  it('dashboard default 1300', () => {
    expect(dashboard(buildScenario('default'), '2025-09').recovered).toBe(1300)
  })
  it('after two checks 2150', () => {
    let s = buildScenario('default')
    const units = unitsOn(s, s.today)
    s = complete(s, units.find((u) => u.subjectId === 's2')!.id)
    s = complete(s, units.find((u) => u.subjectId === 's8')!.id)
    expect(dashboard(s, '2025-09').recovered).toBe(2150)
  })
  it('outstanding counts sent and overdue', () => {
    expect(dashboard(buildScenario('default'), '2025-09').outstanding).toBe(7400)
  })
})

describe('ใบที่ต้องลงมือทำ', () => {
  it('ปิดยอดเดือนใหม่แล้ว บิลค้างเดือนก่อนต้องไม่หายไปจากจอ', () => {
    let s = buildScenario('default')
    // s2 มีบิล ส.ค. ที่เกินกำหนดอยู่
    const aug = s.invoices.find((i) => i.subjectId === 's2' && i.period === '2025-08')!
    expect(['sent', 'overdue']).toContain(aug.status)

    // ปิดยอดเดือน ก.ย. สร้างร่างใบใหม่
    s = { ...s, invoices: [...s.invoices, ...closableSubjects(s, '2025-09').map((c) => c.invoice)] }
    expect(s.invoices.some((i) => i.subjectId === 's2' && i.period === '2025-09')).toBe(true)

    // ใบที่ครูต้องลงมือทำคือใบที่ค้างเงิน ไม่ใช่ร่างใบใหม่
    expect(invoiceToActOn(s, 's2', '2025-09')!.id).toBe(aug.id)
  })

  it('ไม่มีใบค้าง จึงเอาร่างของเดือนนี้', () => {
    let s = buildScenario('default')
    s = { ...s, invoices: [...s.invoices, ...closableSubjects(s, '2025-09').map((c) => c.invoice)] }
    // s1 ไม่มีบิลค้าง
    const shown = invoiceToActOn(s, 's1', '2025-09')!
    expect(shown.period).toBe('2025-09')
    expect(shown.status).toBe('draft')
  })
})

describe('ยอดค้างกับใบที่ต้องลงมือทำ', () => {
  it('จ่ายบางส่วนแล้ว ยอดค้างต้องเหลือเฉพาะส่วนที่ยังไม่ได้', () => {
    let s = buildScenario('default')
    const inv = s.invoices.find((i) => i.status === 'sent' || i.status === 'overdue')!
    const before = dashboard(s, '2025-09').outstanding

    s = reducer(s, { type: 'recordPayment', invoiceId: inv.id, amount: 1000, slipVerified: true })
    const after = dashboard(s, '2025-09')
    expect(after.outstanding).toBe(before - 1000)
    expect(after.received).toBe(1000)
    // เงินก้อนเดียวห้ามอยู่สองฝั่งพร้อมกัน
    expect(after.outstanding + after.received).toBe(before)
  })

  it('ใบที่จ่ายแล้วต้องไม่แย่งที่ร่างของเดือนนี้', () => {
    let s = buildScenario('default')
    const paidNow = {
      id: 'inv-paid-now', clientId: 'c1', subjectId: 's1', period: '2025-09', kind: 'monthly' as const,
      lines: [{ description: 'x', qty: 1, unitPrice: 400, amount: 400 }],
      total: 400, status: 'paid' as const, createdAt: s.today,
    }
    const draftNow = { ...paidNow, id: 'inv-draft-now', status: 'draft' as const }
    s = { ...s, invoices: [...s.invoices, paidNow, draftNow] }
    expect(invoiceToActOn(s, 's1', '2025-09')!.id).toBe('inv-draft-now')
  })
})
