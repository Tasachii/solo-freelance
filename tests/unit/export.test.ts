import { describe, expect, it } from 'vitest'
import { buildScenario } from '../../src/core/scenarios'
import { attendanceCsv, billingCsv } from '../../src/core/export'
import { receiptNumber } from '../../src/core/receipts'

const s = buildScenario('default')

describe('export', () => {
  it('csv has BOM and escapes comma', () => {
    const csv = attendanceCsv(s, '2025-09')
    expect(csv.charCodeAt(0)).toBe(0xfeff)
    expect(csv.split('\n')[1]).toMatch(/^"/)
  })
  it('attendance rows sorted by real date', () => {
    const rows = attendanceCsv(s, '2025-08').split('\n').slice(1)
    const days = rows.map((r) => Number(r.split(',')[0].replace(/"/g, '').split(' ')[0]))
    for (let i = 1; i < days.length; i++) expect(days[i]).toBeGreaterThanOrEqual(days[i - 1])
  })
  it('billing csv lists invoices with thai status', () => {
    expect(billingCsv(s, '2025-08')).toMatch(/ค้างจ่าย|ส่งแล้ว|จ่ายแล้ว/)
  })
  it('neutralizes spreadsheet formulas after leading whitespace/control characters', () => {
    const dangerous = { ...s, subjects: s.subjects.map((x, i) => i === 0 ? { ...x, name: ' \t=HYPERLINK("x")' } : x) }
    const csv = attendanceCsv(dangerous, '2025-08')
    expect(csv).toContain("' =HYPERLINK")
    expect(csv).not.toContain('" \t=HYPERLINK')
  })
  it('exports cancelled status and payment totals, balance, settlement date', () => {
    const inv = s.invoices.find((i) => i.status === 'sent')!
    const withPartial = { ...s,
      units: s.units.map((u, i) => i === 0 ? { ...u, cancelled: true } : u),
      payments: [...s.payments, { id: 'partial', invoiceId: inv.id, amount: 1000, paidAt: '2025-09-02', slipVerified: true }],
    }
    expect(attendanceCsv(withPartial, '2025-08')).toContain('งด')
    const csv = billingCsv(withPartial, inv.period)
    expect(csv).toContain('จ่ายแล้วสะสม')
    expect(csv).toContain('ยอดคงเหลือ')
  })
})

describe('receipts', () => {
  it('counter increments across reset', () => {
    expect(receiptNumber(1, '2025-09-02')).toBe('SL-6809-0001')
    expect(receiptNumber(12, '2025-09-02')).toBe('SL-6809-0012')
  })
})
