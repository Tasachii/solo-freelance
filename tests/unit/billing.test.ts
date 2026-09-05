import { describe, expect, it } from 'vitest'
import { buildScenario } from '../../src/core/scenarios'
import { billingChangeIssue, buildInvoice, daysOverdue, ladderFor } from '../../src/core/billing'
import { subjectById } from '../../src/core/ledger'
import { complete } from '../../src/core/ledger'
import { reducer } from '../../src/core/store'

const s = buildScenario('default')
const P = '2025-08'

describe('billing', () => {
  it('per_unit qty x rate', () => {
    const inv = buildInvoice(subjectById(s, 's2')!, P, s)!
    expect(inv.total).toBe(3000)
    expect(inv.lines[0].qty).toBe(6)
  })
  it('flat ignores qty', () => {
    const inv = buildInvoice(subjectById(s, 's4')!, P, s)!
    expect(inv.total).toBe(3200)
  })
  it('package returns null monthly', () => {
    expect(buildInvoice(subjectById(s, 's6')!, P, s)).toBeNull()
  })
  it('overdue after dueDays', () => {
    const inv = s.invoices.find((i) => i.subjectId === 's2')!
    expect(inv.status).toBe('overdue')
    expect(daysOverdue(s, inv)).toBe(5)
  })
  it('ladder picks highest', () => {
    expect(ladderFor(s, s.invoices.find((i) => i.subjectId === 's2')!)).toBe('clear')
    expect(ladderFor(s, s.invoices.find((i) => i.subjectId === 's5')!)).toBe('final')
  })
})

describe('price snapshots', () => {
  it('เปลี่ยนราคากลางเดือนแล้วคาบเดิมยังใช้ราคาเดิม', () => {
    let s = buildScenario('empty')
    const subject = { id: 's', name: 'งาน', clientId: 'c', active: true, createdAt: s.today,
      billing: { mode: 'per_unit' as const, rate: 400 } }
    s = { ...s, clients: [{ id: 'c', name: 'ลูกค้า' }], subjects: [subject], units: [
      { id: 'u1', subjectId: 's', scheduledAt: s.today, time: '09:00', durationMin: 60 },
      { id: 'u2', subjectId: 's', scheduledAt: s.today, time: '10:00', durationMin: 60 },
    ] }
    s = complete(s, 'u1')
    s = reducer(s, { type: 'upsertSubject', subject: { ...subject, billing: { mode: 'per_unit', rate: 500 } }, clientName: 'ลูกค้า' })
    s = complete(s, 'u2')
    const inv = buildInvoice(subjectById(s, 's')!, s.today.slice(0, 7), s)!
    expect(inv.lines.map((line) => [line.qty, line.unitPrice, line.amount])).toEqual([[1, 400, 400], [1, 500, 500]])
    expect(inv.total).toBe(900)
  })
  it('บล็อกการสลับวิธีคิดเงินเมื่อมีงานที่ยังไม่ออกบิล', () => {
    const before = buildScenario('default')
    const subject = subjectById(before, 's1')!
    expect(billingChangeIssue(before, subject, { mode: 'flat_monthly', amount: 3200 }))
      .toBe('unbilled-mode-change')
    const after = reducer(before, {
      type: 'upsertSubject', subject: { ...subject, billing: { mode: 'flat_monthly', amount: 3200 } }, clientName: 'คุณแม่แพรว',
    })
    expect(subjectById(after, 's1')!.billing).toEqual(subject.billing)
  })

  it('บล็อกการแก้ยอดเหมาเมื่อมีงานที่ยังไม่ออกบิล แต่ยอมให้แก้หลังออกบิลแล้ว', () => {
    let before = buildScenario('default')
    const unit = before.units.find((row) => row.subjectId === 's4' && row.scheduledAt.startsWith('2025-09'))!
    before = complete(before, unit.id)
    const subject = subjectById(before, 's4')!
    expect(billingChangeIssue(before, subject, { mode: 'flat_monthly', amount: 3500 }))
      .toBe('unbilled-flat-price-change')
    before = reducer(before, { type: 'closeMonth', period: '2025-09' })
    expect(billingChangeIssue(before, subjectById(before, 's4')!, { mode: 'flat_monthly', amount: 3500 })).toBeNull()
  })
  it('แพ็กที่เริ่มใช้แล้วต้องสร้างรายการใหม่เมื่อเปลี่ยนวิธีคิดเงิน', () => {
    const state = buildScenario('default')
    const subject = subjectById(state, 's6')!
    expect(billingChangeIssue(state, subject, { mode: 'per_unit', rate: 400 }))
      .toBe('package-history-mode-change')
  })
  it('ข้อมูลเก่าที่ไม่มี snapshot ถูกตรึงด้วยราคาเดิมก่อนแก้เรต', () => {
    const before = buildScenario('default')
    const subject = subjectById(before, 's1')!
    expect(before.completions.some((completion) => completion.unitPrice === undefined)).toBe(true)
    const after = reducer(before, {
      type: 'upsertSubject', subject: { ...subject, billing: { mode: 'per_unit', rate: 500 } }, clientName: 'คุณแม่แพรว',
    })
    expect(buildInvoice(subjectById(after, 's1')!, '2025-08', after)!.total).toBe(3200)
  })
})

it('paid package entitlement survives mode changes before its first completion', () => {
  let state = buildScenario('default')
  const subject = subjectById(state, 's6')!
  const unitIds = new Set(state.units.filter(u => u.subjectId === subject.id).map(u => u.id))
  state = { ...state, completions: state.completions.filter(c => !unitIds.has(c.unitId)) }
  state = reducer(state, { type: 'renewPackage', subjectId: subject.id })
  expect(state.invoices.some(i => i.subjectId === subject.id && i.kind === 'package')).toBe(true)
  expect(billingChangeIssue(state, subject, { mode: 'per_unit', rate: 400 })).toBe('package-history-mode-change')
})
