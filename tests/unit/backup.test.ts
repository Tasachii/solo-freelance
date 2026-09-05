import { describe, expect, it } from 'vitest'
import { BACKUP_FORMAT, daysSinceBackup, fromBackup, toBackup } from '../../src/core/backup'
import { buildScenario } from '../../src/core/scenarios'
import { reducer, SCHEMA } from '../../src/core/store'
import { diffDays, todayISO } from '../../src/core/format'
import { copy } from '../../src/copy'

const s0 = buildScenario('default')

describe('สำรองและกู้คืน', () => {
  it('กู้คืนแล้วได้ข้อมูลเท่าเดิมทุกไบต์', () => {
    const res = fromBackup(toBackup(s0, '2026-09-05T00:00:00Z'), SCHEMA)
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.state).toEqual(s0)
  })

  it('ไฟล์สำรองบอกได้ว่าเป็นของ Solo และสำรองเมื่อไหร่', () => {
    const f = JSON.parse(toBackup(s0, '2026-09-05T00:00:00Z'))
    expect(f.format).toBe(BACKUP_FORMAT)
    expect(f.exportedAt).toBe('2026-09-05T00:00:00Z')
  })

  it('ไฟล์ที่ไม่ใช่ของเราต้องถูกปฏิเสธ ไม่ใช่เขียนทับข้อมูลครู', () => {
    expect(fromBackup('ไม่ใช่ json', SCHEMA)).toEqual({ ok: false, reason: 'unreadable' })
    expect(fromBackup('{"format":"อย่างอื่น"}', SCHEMA)).toEqual({ ok: false, reason: 'wrongFile' })
    expect(fromBackup(JSON.stringify({ format: BACKUP_FORMAT }), SCHEMA)).toEqual({ ok: false, reason: 'wrongFile' })
  })

  it('ไฟล์แอปอื่นที่บังเอิญมีโครงคล้ายกัน ก็ต้องถูกปฏิเสธ', () => {
    // เคสจริง: ครูเลือกไฟล์ export ของแอปอื่นที่มีคำว่า subjects เหมือนกัน
    const lookalike = JSON.stringify({
      format: 'other-app-export-v2', exportedAt: 'x',
      app: { schemaVersion: SCHEMA, subjects: [{ id: 'x' }] },
    })
    expect(fromBackup(lookalike, SCHEMA)).toEqual({ ok: false, reason: 'wrongFile' })
  })

  it('ไฟล์จากเวอร์ชันอื่นถูกปฏิเสธ', () => {
    const old = JSON.stringify({ format: BACKUP_FORMAT, exportedAt: 'x', app: { ...s0, schemaVersion: 3 } })
    expect(fromBackup(old, SCHEMA)).toEqual({ ok: false, reason: 'wrongVersion' })
  })
})

describe('เตือนเมื่อไม่ได้สำรองนาน', () => {
  it('ไม่เคยสำรองเลย = เตือน', () => {
    expect(daysSinceBackup(s0, '2025-09-02', diffDays)).toBe(Infinity)
  })

  it('นับวันจากครั้งล่าสุด และรีเซ็ตเมื่อสำรองใหม่', () => {
    const s = { ...s0, lastBackupAt: '2025-08-20' }
    expect(daysSinceBackup(s, '2025-09-02', diffDays)).toBe(13)
    expect(daysSinceBackup(reducer(s, { type: 'backedUp' }), '2025-09-02', diffDays)).toBe(0)
  })
})

describe('ข้อความเตือนอ่านรู้เรื่อง', () => {
  it('ยังไม่เคยสำรอง ต้องไม่ขึ้นว่า "มา — วัน"', () => {
    const never = daysSinceBackup(s0, '2025-09-02', diffDays)
    const shown = Number.isFinite(never)
      ? copy.billing.backupWarn.replace('{days}', String(never))
      : copy.billing.backupNever
    expect(shown).toBe(copy.billing.backupNever)
    expect(shown).not.toMatch(/—\s*วัน/)
    expect(shown).not.toMatch(/\{days\}/)
  })

  it('เคยสำรองแล้ว บอกจำนวนวันเป็นตัวเลข', () => {
    const s = { ...s0, lastBackupAt: '2025-08-20' }
    const shown = copy.billing.backupWarn.replace('{days}', String(daysSinceBackup(s, '2025-09-02', diffDays)))
    expect(shown).toContain('13 วัน')
    expect(shown).not.toMatch(/\{days\}/)
  })
})

describe('ไฟล์ที่ขาดครึ่งต้องไม่ผ่าน', () => {
  const wrap = (app: unknown) => JSON.stringify({ format: BACKUP_FORMAT, exportedAt: 'x', app })

  it('มีแค่ subjects แต่ขาด collection อื่น = ปฏิเสธ ไม่ใช่ปล่อยไปทำจอขาว', () => {
    expect(fromBackup(wrap({ schemaVersion: SCHEMA, subjects: [] }), SCHEMA))
      .toEqual({ ok: false, reason: 'wrongFile' })
  })

  it('ขาด messages อย่างเดียวก็ไม่ผ่าน — normalize วนลูปมันทุกครั้ง', () => {
    const app = JSON.parse(JSON.stringify(s0)) as Record<string, unknown>
    delete app.messages
    expect(fromBackup(wrap(app), SCHEMA)).toEqual({ ok: false, reason: 'wrongFile' })
  })

  it('ขาด counters ก็ไม่ผ่าน — เลขที่ใบเสร็จเดินต่อไม่ได้', () => {
    const app = JSON.parse(JSON.stringify(s0)) as Record<string, unknown>
    delete app.counters
    expect(fromBackup(wrap(app), SCHEMA)).toEqual({ ok: false, reason: 'wrongFile' })
  })

  it('ไฟล์ครบถ้วนยังผ่านเหมือนเดิม', () => {
    expect(fromBackup(wrap(s0), SCHEMA).ok).toBe(true)
  })
})

describe('กู้คืนแล้ววันต้องไม่แช่แข็ง', () => {
  it('ไฟล์โหมดจริงที่สำรองไว้สัปดาห์ก่อน กู้แล้ว today ต้องเป็นวันนี้', () => {
    const old = { ...s0, mode: 'real' as const, today: '2026-08-01' }
    const after = reducer(s0, { type: 'restore', state: old })
    expect(after.today).toBe(todayISO())
    expect(after.mode).toBe('real')
  })

  it('ไฟล์เดโมยังคงวันที่ล็อกไว้ตามเดิม', () => {
    const after = reducer(s0, { type: 'restore', state: { ...s0, today: '2025-09-02' } })
    expect(after.today).toBe('2025-09-02')
  })
})

describe('deep backup integrity', () => {
  const wrapDeep = (app: unknown) => JSON.stringify({ format: BACKUP_FORMAT, exportedAt: '2026-09-06T00:00:00Z', app })
  it.each([
    ['invalid mode', (a: any) => { a.mode = 'invalid-mode' }],
    ['invalid date', (a: any) => { a.today = '2025-02-30' }],
    ['negative payment', (a: any) => { a.payments[0].amount = -500 }],
    ['orphan payment', (a: any) => { a.payments[0].invoiceId = 'missing' }],
    ['wrong invoice total', (a: any) => { a.invoices[0].total += 1 }],
    ['stale receipt counter', (a: any) => { a.counters.receipt = 0 }],
    ['null nested row', (a: any) => { a.invoices[0].lines[0] = null }],
    ['invalid receipt number type', (a: any) => { a.receipts[0].number = 42 }],
    ['invalid receipt id type', (a: any) => { a.receipts[0].id = 42 }],
    ['null sending state', (a: any) => { a.sending = null }],
    ['null subject billing', (a: any) => { a.subjects[0].billing = null }],
    ['null receipt metadata', (a: any) => {
      const message = a.messages.find((row: any) => row.kind === 'receipt'); message.meta = null
    }],
    ['null event props', (a: any) => { a.events.push({ at: '2026-09-06T00:00:00Z', name: 'test', props: null }) }],
    ['invalid waitlist modes', (a: any) => { a.waitlist.push({ professionId: 'tutor', name: 'a', contact: 'b', at: a.today, modes: [null] }) }],
    ['orphan invoice message metadata', (a: any) => {
      const message = a.messages.find((row: any) => row.kind === 'receipt')
      message.kind = 'invoice'; message.meta = { invoiceId: 'missing' }
    }],
    ['orphan receipt message metadata', (a: any) => {
      const message = a.messages.find((row: any) => row.kind === 'receipt')
      message.meta = { receiptId: 'missing' }
    }],
    ['receipt for unsettled invoice', (a: any) => {
      const invoice = a.invoices.find((row: any) => row.status === 'sent' || row.status === 'overdue')
      a.payments.push({ id: 'partial-for-receipt', invoiceId: invoice.id, amount: 1, paidAt: a.today, slipVerified: true })
      a.counters.receipt += 1
      a.receipts.push({ id: `rc-${a.counters.receipt}`, paymentId: 'partial-for-receipt', number: `SL-6909-${String(a.counters.receipt).padStart(4, '0')}`, issuedAt: a.today })
    }],
    ['invoice client does not own subject', (a: any) => { a.invoices[0].clientId = 'c2' }],
    ['message client does not own subject', (a: any) => { a.messages[0].clientId = 'c2' }],
    ['payment predates invoice', (a: any) => { a.payments[0].paidAt = '2020-01-01' }],
    ['receipt date differs from linked payment', (a: any) => { a.receipts[0].issuedAt = '2025-09-01' }],
    ['duplicate receipt for one invoice', (a: any) => {
      const existing = a.receipts[0]
      a.counters.receipt += 1
      a.receipts.push({ ...existing, id: `rc-${a.counters.receipt}`, number: `SL-6809-${String(a.counters.receipt).padStart(4, '0')}` })
    }],
    ['receipt linked to an earlier installment on the same day', (a: any) => {
      const receipt = a.receipts[0]
      const payment = a.payments.find((row: any) => row.id === receipt.paymentId)
      const invoice = a.invoices.find((row: any) => row.id === payment.invoiceId)
      payment.amount = 1000
      a.payments.push({ ...payment, id: 'final-same-day', amount: invoice.total - 1000 })
    }],
    ['invoice message points to another subject invoice', (a: any) => {
      const message = a.messages[0]
      message.kind = 'invoice'; message.meta = { invoiceId: a.invoices.find((row: any) => row.subjectId !== message.subjectId).id }
    }],
    ['invalid invoice month', (a: any) => { a.invoices[0].period = '2025-13' }],
    ['duplicate carried completion', (a: any) => {
      const subject = a.subjects.find((row: any) => row.billing.mode === 'package')
      const unit = a.units.find((row: any) => row.subjectId === subject.id && a.completions.some((completion: any) => completion.unitId === row.id))
      subject.billing.carriedUnitIds = [unit.id, unit.id]
    }],
    ['carried completion from another subject', (a: any) => {
      const subject = a.subjects.find((row: any) => row.billing.mode === 'package')
      const unit = a.units.find((row: any) => row.subjectId !== subject.id && a.completions.some((completion: any) => completion.unitId === row.id))
      subject.billing.carriedUnitIds = [unit.id]
    }],
  ])('rejects %s with details', (_name, mutate) => {
    const app: any = structuredClone(s0)
    mutate(app)
    const result = fromBackup(wrapDeep(app), SCHEMA)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.details?.length).toBeGreaterThan(0)
  })

  it.each(['clients', 'subjects', 'units', 'completions', 'invoices', 'payments', 'receipts', 'messages', 'chats', 'waitlist', 'events'])
  ('rejects null row in %s without throwing', (collection) => {
    const app: any = structuredClone(s0)
    if (app[collection].length) app[collection][0] = null
    else app[collection].push(null)
    expect(() => fromBackup(wrapDeep(app), SCHEMA)).not.toThrow()
    const result = fromBackup(wrapDeep(app), SCHEMA)
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.details?.length).toBeGreaterThan(0)
  })

  it.each(['provider', 'counters'])('rejects null %s without throwing', (key) => {
    const app: any = structuredClone(s0)
    app[key] = null
    expect(() => fromBackup(wrapDeep(app), SCHEMA)).not.toThrow()
    expect(fromBackup(wrapDeep(app), SCHEMA).ok).toBe(false)
  })
})
