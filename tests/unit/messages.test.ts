import { describe, expect, it } from 'vitest'
import { buildScenario } from '../../src/core/scenarios'
import { deriveDrafts, reminderText, render } from '../../src/core/messages'
import { reducer } from '../../src/core/store'
import { complete, subjectById, unitsOn } from '../../src/core/ledger'
import { closableSubjects } from '../../src/core/billing'
import type { AppState } from '../../src/core/types'

const withDrafts = (s: AppState): AppState => ({ ...s, messages: [...s.messages, ...deriveDrafts(s)] })

describe('messages', () => {
  it('render throws on missing var (dev)', () => {
    expect(() => render('สวัสดี {name}', {})).toThrow(/missing template var/)
  })
  it('default scenario yields 3 drafts', () => {
    const s = withDrafts(buildScenario('default'))
    expect(s.messages.filter((m) => m.status === 'draft')).toHaveLength(3)
  })
  it('dedupe by key', () => {
    const s = withDrafts(buildScenario('default'))
    expect(deriveDrafts(s)).toHaveLength(0)
  })
  it('skipped not recreated', () => {
    let s = withDrafts(buildScenario('default'))
    const first = s.messages.find((m) => m.status === 'draft')!
    s = { ...s, messages: s.messages.map((m) => (m.id === first.id ? { ...m, status: 'skipped' as const } : m)) }
    expect(deriveDrafts(s).some((m) => m.dedupeKey === first.dedupeKey)).toBe(false)
  })
  it('higher ladder creates new', () => {
    let s = withDrafts(buildScenario('default'))
    s = { ...s, today: '2025-09-06' } // #2 ค้าง 9 วัน → final
    const add = deriveDrafts(s)
    expect(add.some((m) => m.dedupeKey.endsWith(':final') && m.dedupeKey.includes('s2'))).toBe(true)
  })
  it('after exhausted check yields 4', () => {
    let s = withDrafts(buildScenario('default'))
    const u8 = unitsOn(s, s.today).find((u) => u.subjectId === 's8')!
    s = withDrafts(complete(s, u8.id))
    expect(s.messages.filter((m) => m.status === 'draft')).toHaveLength(4)
  })
  it('after close month yields 9', () => {
    let s = withDrafts(buildScenario('default'))
    const u8 = unitsOn(s, s.today).find((u) => u.subjectId === 's8')!
    s = withDrafts(complete(s, u8.id))
    s = { ...s, invoices: [...s.invoices, ...closableSubjects(s, '2025-09').map((c) => c.invoice)] }
    s = withDrafts(s)
    expect(s.messages.filter((m) => m.status === 'draft')).toHaveLength(9)
  })
  it('renewal window is remaining 1..2 only', () => {
    // s6 แพ็ก 10 ใช้ไป 3 — ขยับ total เพื่อทดสอบขอบเขต โดยไม่แตะ ledger
    const at = (total: number): number => {
      const base = buildScenario('default')
      const s: AppState = {
        ...base,
        subjects: base.subjects.map((x) =>
          x.id === 's6' && x.billing.mode === 'package'
            ? { ...x, billing: { ...x.billing, total } }
            : x),
      }
      return deriveDrafts(s).filter((m) => m.kind === 'renewal' && m.subjectId === 's6').length
    }
    expect(at(7)).toBe(0) // เหลือ 4 — ยังไม่เตือน
    expect(at(6)).toBe(0) // เหลือ 3 — ยังไม่เตือน (ขอบบน)
    expect(at(5)).toBe(1) // เหลือ 2 — เตือน
    expect(at(4)).toBe(1) // เหลือ 1 — เตือน
    expect(at(3)).toBe(0) // เหลือ 0 — หมดแล้ว ไม่ใช่ renewal (ขอบล่าง)
  })
  it('no unresolved placeholders', () => {
    const s = withDrafts(buildScenario('default'))
    expect(s.messages.every((m) => !m.draft.includes('{'))).toBe(true)
    expect(subjectById(s, 's1')).toBeTruthy()
  })
  it('ข้อความทวงใช้ยอดคงเหลือหลังจ่ายบางส่วน', () => {
    const before = buildScenario('default')
    const invoice = before.invoices.find((row) => row.total === 3000 && row.status !== 'paid')!
    const after = reducer(before, { type: 'recordPayment', invoiceId: invoice.id, amount: 1000, slipVerified: true })
    expect(reminderText(after, invoice, 'soft')).toContain('2,000')
    expect(reminderText(after, invoice, 'soft')).not.toContain('3,000')
  })
})
