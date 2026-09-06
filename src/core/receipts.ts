import type { AppState, Payment, Receipt, ReceiptSnapshot } from './types'
import { parseISO } from './format'
import { paidAmount } from './ledger'

export function receiptSnapshot(state: AppState, payment: Payment, legacyBackfill = false): ReceiptSnapshot | null {
  const invoice = state.invoices.find(row => row.id === payment.invoiceId)
  const payer = invoice && state.clients.find(row => row.id === invoice.clientId)
  const subject = invoice && state.subjects.find(row => row.id === invoice.subjectId)
  if (!invoice || !payer || !subject) return null
  const invoicePayments = state.payments.filter(row => row.invoiceId === invoice.id)
  const slipVerified = invoicePayments.length > 0 && invoicePayments.every(row => row.slipVerified)
  const slipAmount = invoicePayments.length > 0 && invoicePayments.every(row => row.slipAmount !== undefined)
    ? invoicePayments.reduce((sum, row) => sum + row.slipAmount!, 0)
    : undefined
  return {
    provider: state.provider.name, destination: state.provider.promptpayId,
    payer: payer.name, subject: subject.name, period: invoice.period,
    lines: invoice.lines.map(line => ({ ...line })), total: invoice.total,
    paid: paidAmount(state, invoice.id), slipVerified,
    ...(slipAmount !== undefined ? { slipAmount } : {}),
    ...(legacyBackfill ? { legacyBackfill: true as const } : {}),
  }
}

export function snapshotLegacyReceipts(state: AppState): AppState | null {
  let changed = false
  const receipts = state.receipts.map(receipt => {
    if (receipt.snapshot) return receipt
    const payment = state.payments.find(row => row.id === receipt.paymentId)
    const snapshot = payment && receiptSnapshot(state, payment, true)
    if (!snapshot) return receipt
    changed = true
    return { ...receipt, snapshot }
  })
  if (receipts.some(receipt => !receipt.snapshot)) return null
  return changed ? { ...state, receipts } : state
}

/** SL-{YY}{MM}-{NNNN} — counter ไม่ซ้ำแม้ reset ภายในคีย์เดียวกัน */
export function receiptNumber(counter: number, onDate: string): string {
  const { y, m } = parseISO(onDate)
  const yy = String((y + 543) % 100).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  return `SL-${yy}${mm}-${String(counter).padStart(4, '0')}`
}

export function issueReceipt(state: AppState, payment: Payment): { state: AppState; receipt: Receipt } {
  const next = state.counters.receipt + 1
  const snapshot = receiptSnapshot(state, payment)
  if (!snapshot) throw new Error('receipt snapshot source missing')
  const receipt: Receipt = {
    id: `rc-${next}`, paymentId: payment.id,
    number: receiptNumber(next, payment.paidAt), issuedAt: payment.paidAt, snapshot,
  }
  return {
    state: { ...state, receipts: [...state.receipts, receipt], counters: { ...state.counters, receipt: next } },
    receipt,
  }
}

export const receiptOfPayment = (s: AppState, paymentId: string): Receipt | undefined =>
  s.receipts.find((r) => r.paymentId === paymentId)

export const receiptOfInvoice = (s: AppState, invoiceId: string): Receipt | undefined => {
  // ใบเสร็จออกตอนปิดยอด จึงห้อยอยู่กับ payment ตัวสุดท้าย ไม่ใช่ตัวแรก
  // บิลที่จ่ายเป็นงวดเคยหาไม่เจอเพราะเอาตัวแรกมาเทียบ
  const pays = s.payments.filter((p) => p.invoiceId === invoiceId)
  for (let i = pays.length - 1; i >= 0; i--) {
    const r = s.receipts.find((x) => x.paymentId === pays[i].id)
    if (r) return r
  }
  return undefined
}
