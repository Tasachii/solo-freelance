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
})

describe('receipts', () => {
  it('counter increments across reset', () => {
    expect(receiptNumber(1, '2025-09-02')).toBe('SL-6809-0001')
    expect(receiptNumber(12, '2025-09-02')).toBe('SL-6809-0012')
  })
})
