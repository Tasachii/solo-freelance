import { describe, expect, it } from 'vitest'
import { reducer } from '../../src/core/store'
import { buildScenario } from '../../src/core/scenarios'
import { unitsOn } from '../../src/core/ledger'

const base = () => reducer(buildScenario('default'), { type: 'track', name: 'init' })
const drafts = (s: ReturnType<typeof base>, kind: string) =>
  s.messages.filter((m) => m.kind === kind && m.status === 'draft')

describe('ถอนร่างที่เงื่อนไขหายไป', () => {
  it('ถอนเช็คชื่อแล้ว ร่างชวนต่อ(แพ็กหมด)ต้องหายไป ไม่ใช่ค้างเป็น "ครั้งที่ 0"', () => {
    let s = base()
    const u = unitsOn(s, s.today).find((x) => x.subjectId === 's8')!

    s = reducer(s, { type: 'complete', unitId: u.id })
    expect(drafts(s, 'renewal_exhausted')).toHaveLength(1)

    s = reducer(s, { type: 'uncomplete', unitId: u.id })
    expect(drafts(s, 'renewal_exhausted')).toHaveLength(0)
    // และต้องไม่มีข้อความไหนพูดถึง "ครั้งที่ 0"
    expect(s.messages.every((m) => !/ครั้งที่ 0/.test(m.draft))).toBe(true)
  })

  it('งดคาบก็ถอนร่างเหมือนกัน', () => {
    let s = base()
    const u = unitsOn(s, s.today).find((x) => x.subjectId === 's8')!
    s = reducer(s, { type: 'complete', unitId: u.id })
    expect(drafts(s, 'renewal_exhausted')).toHaveLength(1)
    s = reducer(s, { type: 'cancelUnit', unitId: u.id })
    expect(drafts(s, 'renewal_exhausted')).toHaveLength(0)
  })

  it('เช็คชื่อใหม่แล้วร่างกลับมา — ถอนไม่ใช่การข้าม', () => {
    let s = base()
    const u = unitsOn(s, s.today).find((x) => x.subjectId === 's8')!
    s = reducer(s, { type: 'complete', unitId: u.id })
    s = reducer(s, { type: 'uncomplete', unitId: u.id })
    s = reducer(s, { type: 'complete', unitId: u.id })
    expect(drafts(s, 'renewal_exhausted')).toHaveLength(1)
  })

  it('ร่างที่ส่งหรือข้ามไปแล้วไม่ถูกแตะ — นั่นคือการตัดสินใจของครู', () => {
    let s = base()
    const u = unitsOn(s, s.today).find((x) => x.subjectId === 's8')!
    s = reducer(s, { type: 'complete', unitId: u.id })
    const id = drafts(s, 'renewal_exhausted')[0].id
    s = reducer(s, { type: 'skipMessage', id })
    s = reducer(s, { type: 'uncomplete', unitId: u.id })
    expect(s.messages.find((m) => m.id === id)?.status).toBe('skipped')
  })

  it('บิลที่ส่งไปแล้ว ร่าง "บิลใหม่" ต้องหายไป', () => {
    let s = base()
    s = { ...s, invoices: [...s.invoices, {
      id: 'inv-test', clientId: 'c1', subjectId: 's1', period: '2025-09', kind: 'monthly' as const,
      lines: [{ description: 'x', qty: 1, unitPrice: 400, amount: 400 }],
      total: 400, status: 'draft' as const, createdAt: s.today,
    }] }
    s = reducer(s, { type: 'track', name: 'x' })
    const d = drafts(s, 'invoice').find((m) => m.meta?.invoiceId === 'inv-test')!
    expect(d).toBeTruthy()

    s = reducer(s, { type: 'sendMessage', id: d.id })
    expect(drafts(s, 'invoice').some((m) => m.meta?.invoiceId === 'inv-test')).toBe(false)
  })
})
