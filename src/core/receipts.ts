import type { AppState, Payment, Receipt } from './types'
import { parseISO } from './format'

/** SL-{YY}{MM}-{NNNN} — counter ไม่ซ้ำแม้ reset ภายในคีย์เดียวกัน */
export function receiptNumber(counter: number, onDate: string): string {
  const { y, m } = parseISO(onDate)
  const yy = String((y + 543) % 100).padStart(2, '0')
  const mm = String(m).padStart(2, '0')
  return `SL-${yy}${mm}-${String(counter).padStart(4, '0')}`
}

export function issueReceipt(state: AppState, payment: Payment): { state: AppState; receipt: Receipt } {
  const next = state.counters.receipt + 1
  const receipt: Receipt = {
    id: `rc-${next}`, paymentId: payment.id,
    number: receiptNumber(next, payment.paidAt), issuedAt: payment.paidAt,
  }
  return {
    state: { ...state, receipts: [...state.receipts, receipt], counters: { ...state.counters, receipt: next } },
    receipt,
  }
}

export const receiptOfPayment = (s: AppState, paymentId: string): Receipt | undefined =>
  s.receipts.find((r) => r.paymentId === paymentId)

export const receiptOfInvoice = (s: AppState, invoiceId: string): Receipt | undefined => {
  const pay = s.payments.find((p) => p.invoiceId === invoiceId)
  return pay ? receiptOfPayment(s, pay.id) : undefined
}
