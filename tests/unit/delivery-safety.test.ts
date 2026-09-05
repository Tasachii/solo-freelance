import { describe, expect, it } from 'vitest'
import { buildScenario } from '../../src/core/scenarios'
import { reducer } from '../../src/core/store'
import { answer } from '../../src/core/faq'
import { messageSendIssue } from '../../src/core/messageDelivery'
import { readDocument } from '../../src/core/documents'

describe('financial draft freshness', () => {
  it('preserves edited prose but blocks stale balances until regenerated', () => {
    let s = reducer(buildScenario('default'), { type: 'track', name: 'init' })
    s = { ...s, mode: 'real', provider: { name: 'ผู้รับเงิน', promptpayId: '0812345678' } }
    s = reducer(s, { type: 'track', name: 'refresh' })
    const m = s.messages.find(m => m.kind === 'reminder')!
    s = reducer(s, { type: 'editMessage', id: m.id, draft: `${m.draft}\nขอบคุณมากครับ` })
    s = reducer(s, { type: 'recordPayment', invoiceId: String(m.meta!.invoiceId), amount: 100, slipVerified: false })
    const stale = s.messages.find(x => x.id === m.id)!
    expect(stale.draft).toContain('ขอบคุณมากครับ')
    expect(messageSendIssue(s, stale)).toContain('ยอดหรือข้อมูลเปลี่ยน')
    expect(reducer(s, { type: 'sendMessage', id: m.id })).toBe(s)
    s = reducer(s, { type: 'refreshMessage', id: m.id })
    expect(messageSendIssue(s, s.messages.find(x => x.id === m.id)!)).toBeNull()
  })
  it('multi-invoice FAQ lists each matching balance and document', () => {
    const s = buildScenario('default')
    s.mode = 'real'
    s.provider = { name: 'ผู้รับเงิน', promptpayId: '0812345678' }
    const first = s.invoices.find(i => i.status === 'overdue')!
    s.invoices.push({ ...first, id: 'another-invoice', total: 1234, lines: [{ description: 'อีกใบ', qty: 1, unitPrice: 1234, amount: 1234 }] })
    const text = answer(s, first.clientId, 'ยังค้าง').text
    const urls = text.match(/\/document\/[\w-]+/g)!
    expect(urls).toHaveLength(2)
    expect(urls.map(url => readDocument(url.split('/document/')[1])!.total)).toEqual([first.total, 1234])
  })
})
