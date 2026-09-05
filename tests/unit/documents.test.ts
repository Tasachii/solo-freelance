import { describe, expect, it } from 'vitest'
import { buildScenario } from '../../src/core/scenarios'
import { documentUrl, invoiceDocument, readDocument, receiptDocument } from '../../src/core/documents'

describe('portable recipient documents', () => {
  it('round trips Thai invoice data without any provider storage or other clients', () => {
    const s = buildScenario('default')
    const inv = s.invoices[0]
    const doc = invoiceDocument(s, inv.id)!
    const url = documentUrl(doc)
    expect(readDocument(url.split('/document/')[1])).toEqual(doc)
    expect(JSON.stringify(doc)).not.toContain('events')
    expect(JSON.stringify(doc)).not.toContain('chats')
    expect(doc.payer).toBe(s.clients.find(c => c.id === inv.clientId)!.name)
    expect(doc.total).toBe(inv.total)
  })
  it('settlement receipt uses invoice total, including installments', () => {
    const s = buildScenario('default')
    const rc = s.receipts[0]
    const pay = s.payments.find(p => p.id === rc.paymentId)!
    const inv = s.invoices.find(i => i.id === pay.invoiceId)!
    pay.amount = inv.total - 100
    s.payments.push({ ...pay, id: 'earlier', amount: 100 })
    const doc = receiptDocument(s, rc.id)!
    expect(doc.total).toBe(inv.total)
    expect(doc.paid).toBe(inv.total)
    expect(doc.number).toBe(rc.number)
  })
  it('rejects corrupted, oversized and invalid financial snapshots', () => {
    expect(readDocument('not-a-document')).toBeNull()
    expect(readDocument('a'.repeat(20000))).toBeNull()
    const s = buildScenario('default')
    const doc = invoiceDocument(s, s.invoices[0].id)!
    expect(() => documentUrl({ ...doc, total: -1 })).toThrow()
  })
})
