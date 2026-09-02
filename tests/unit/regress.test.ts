import { describe, expect, it } from 'vitest'
import { buildScenario } from '../../src/core/scenarios'
import { complete, packageStatus, renewPackage, subjectById, unitsOn } from '../../src/core/ledger'
import { deriveDrafts, refreshDrafts } from '../../src/core/messages'
import { buildInvoice, markOverdue } from '../../src/core/billing'

describe('regressions', () => {
  it('renewing does not re-count a lesson the old package already billed', () => {
    let s = buildScenario('default')
    const u8 = unitsOn(s, s.today).find((u) => u.subjectId === 's8')!
    s = complete(s, u8.id)
    expect(packageStatus(s, subjectById(s, 's8')!)!.overBy).toBe(1) // คิดเป็นส่วนเกินแล้ว
    s = renewPackage(s, 's8')
    const pk = packageStatus(s, subjectById(s, 's8')!)!
    expect(pk.used).toBe(0)        // คาบเดิมต้องไม่ถูกแพ็กใหม่นับซ้ำ
    expect(pk.remaining).toBe(10)
  })

  it('renewing still starts a clean package when nothing was used today', () => {
    let s = buildScenario('default')
    s = renewPackage(s, 's6')
    const pk = packageStatus(s, subjectById(s, 's6')!)!
    expect(pk.used).toBe(0)
    expect(pk.remaining).toBe(pk.total)
  })

  it('every invoice line satisfies qty x unitPrice === amount', () => {
    const s = buildScenario('default')
    for (const sub of s.subjects) {
      const inv = buildInvoice(sub, '2025-08', s)
      if (!inv) continue
      for (const l of inv.lines) expect(l.qty * l.unitPrice).toBe(l.amount)
    }
  })

  it('no message repeats the honorific', () => {
    const s = buildScenario('default')
    const all = [...s.messages, ...deriveDrafts(s)]
    expect(all.length).toBeGreaterThan(0)
    for (const m of all) expect(m.draft).not.toMatch(/คุณคุณ/)
  })
})

describe('draft freshness', () => {
  it('a pending reminder keeps its day count in step with the ledger', () => {
    let s = buildScenario('default')
    s = { ...s, messages: [...s.messages, ...deriveDrafts(s)] }
    const before = s.messages.find((m) => m.kind === 'reminder' && m.status === 'draft')!
    expect(before.draft).toMatch(/5 วัน/) // #2 ค้าง 5 วัน ณ วันที่เปิด

    s = markOverdue({ ...s, today: '2025-09-05' })
    const after = refreshDrafts(s).find((m) => m.id === before.id)!
    expect(after.draft).toMatch(/8 วัน/)
    expect(after.draft).not.toMatch(/5 วัน/)
  })

  it('a draft the user edited is left alone', () => {
    let s = buildScenario('default')
    s = { ...s, messages: [...s.messages, ...deriveDrafts(s)] }
    const first = s.messages.find((m) => m.kind === 'reminder' && m.status === 'draft')!
    s = {
      ...s, today: '2025-09-05',
      messages: s.messages.map((m) => (m.id === first.id ? { ...m, draft: 'ข้อความที่ครูแก้เอง', edited: true } : m)),
    }
    expect(refreshDrafts(s).find((m) => m.id === first.id)!.draft).toBe('ข้อความที่ครูแก้เอง')
  })
})
