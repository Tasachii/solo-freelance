import { describe, expect, it } from 'vitest'
import { buildScenario } from '../../src/core/scenarios'
import { buildInvoice, daysOverdue, ladderFor } from '../../src/core/billing'
import { subjectById } from '../../src/core/ledger'

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
