import type { AppState, Invoice, Message, MessageKind, Subject } from './types'
import { tutorTemplates } from '../copy/tutor'
import { professionById } from '../professions'
import { clientById, completionsIn, packageStatus, subjectById } from './ledger'
import { daysOverdue, dueDaysOf, invoiceFor, ladderFor } from './billing'
import { addDays, money, periodThai } from './format'

type Vars = Record<string, string | number>

/** แทนตัวแปรใน template — dev: throw ถ้าขาด · prod: ใส่ "—" แล้ว log */
export function render(template: string, vars: Vars): string {
  return template.replace(/\{(\w+)\}/g, (_m, key: string) => {
    const v = vars[key]
    if (v === undefined || v === null || v === '') {
      if (import.meta.env?.DEV) throw new Error(`missing template var: ${key}`)
      console.error(`[solo] missing template var: ${key}`)
      return '—'
    }
    return String(v)
  })
}

export const invoiceUrlOf = (clientId: string): string => `#/client/${clientId}`
export const receiptUrlOf = (receiptId: string): string => `#/receipt/${receiptId}`

function baseVars(state: AppState, subject: Subject): Vars {
  const prof = professionById(state.professionId)
  const client = clientById(state, subject.clientId)
  return {
    clientHonorific: prof.vocab.clientHonorific,
    clientName: client?.name ?? '—',
    subjectName: subject.name,
    invoiceUrl: invoiceUrlOf(subject.clientId),
  }
}

export function invoiceText(state: AppState, inv: Invoice): string {
  const subject = subjectById(state, inv.subjectId)!
  const vars = {
    ...baseVars(state, subject),
    periodThai: periodThai(inv.period),
    qty: inv.lines.reduce((n, l) => n + l.qty, 0),
    total: money(inv.total),
  }
  const flat = subject.billing.mode === 'flat_monthly'
  return render(flat ? tutorTemplates.invoiceFlat : tutorTemplates.invoice, vars)
}

export function reminderText(state: AppState, inv: Invoice, key: 'soft' | 'clear' | 'final'): string {
  const subject = subjectById(state, inv.subjectId)!
  return render(tutorTemplates.reminder[key], {
    ...baseVars(state, subject),
    periodThai: periodThai(inv.period),
    total: money(inv.total),
    daysOverdue: daysOverdue(state, inv),
  })
}

export function renewalText(state: AppState, subject: Subject, exhausted: boolean): string {
  const pk = packageStatus(state, subject)!
  const vars: Vars = {
    ...baseVars(state, subject),
    packageTotal: pk.total, packagePrice: money(pk.price),
    remaining: exhausted ? pk.remaining : Math.max(pk.remaining, 1),
    overBy: pk.overBy,
  }
  if (exhausted) return render(tutorTemplates.renewalExhausted, vars)
  return render(tutorTemplates.renewal, vars)
}

export function receiptText(state: AppState, inv: Invoice, receiptId: string, total: number): string {
  const subject = subjectById(state, inv.subjectId)!
  return render(tutorTemplates.receipt, {
    ...baseVars(state, subject),
    periodThai: periodThai(inv.period),
    total: money(total),
    receiptUrl: receiptUrlOf(receiptId),
  })
}

export function slipRequestText(state: AppState, inv: Invoice, slipAmount: number): string {
  const subject = subjectById(state, inv.subjectId)!
  return render(tutorTemplates.slipRequest, {
    ...baseVars(state, subject),
    slipAmount: money(slipAmount),
    total: money(inv.total),
  })
}

export const hasKey = (state: AppState, dedupeKey: string): boolean =>
  state.messages.some((m) => m.dedupeKey === dedupeKey)

let seq = 0
export function mkMessage(
  state: AppState, kind: MessageKind, clientId: string, subjectId: string | undefined,
  draft: string, dedupeKey: string, meta?: Record<string, unknown>,
): Message {
  seq += 1
  return {
    id: `m-${dedupeKey}-${seq}`, clientId, subjectId, kind, draft,
    status: 'draft', createdAt: state.today, dedupeKey, ...(meta ? { meta } : {}),
  }
}

/**
 * สร้าง draft ที่ยังไม่มี — ไม่สร้างซ้ำถ้า dedupeKey เคยมีแล้ว (ไม่ว่าสถานะไหน)
 * reminder ระดับสูงกว่า = key ใหม่ จึงสร้างได้อีก
 */
export function deriveDrafts(state: AppState): Message[] {
  const add: Message[] = []
  const seen = new Set(state.messages.map((m) => m.dedupeKey))
  const push = (m: Message) => { if (!seen.has(m.dedupeKey)) { seen.add(m.dedupeKey); add.push(m) } }

  for (const inv of state.invoices) {
    const subject = subjectById(state, inv.subjectId)
    if (!subject) continue

    if (inv.kind === 'monthly' && inv.status === 'draft') {
      push(mkMessage(state, 'invoice', inv.clientId, subject.id, invoiceText(state, inv), `inv:${inv.id}`, { invoiceId: inv.id }))
    }
    if (inv.status === 'sent' || inv.status === 'overdue') {
      const key = ladderFor(state, inv)
      if (key) {
        push(mkMessage(state, 'reminder', inv.clientId, subject.id, reminderText(state, inv, key),
          `rem:${inv.id}:${key}`, { invoiceId: inv.id, ladder: key }))
      }
    }
  }

  for (const p of state.payments) {
    const r = state.receipts.find((x) => x.paymentId === p.id)
    if (!r) continue
    const inv = state.invoices.find((i) => i.id === p.invoiceId)
    if (!inv) continue
    const subject = subjectById(state, inv.subjectId)
    if (!subject) continue
    push(mkMessage(state, 'receipt', inv.clientId, subject.id, receiptText(state, inv, r.id, p.amount),
      `rcp:${p.id}`, { receiptId: r.id }))
  }

  for (const subject of state.subjects) {
    if (!subject.active) continue
    const pk = packageStatus(state, subject)
    if (!pk) continue
    if (pk.overBy >= 1) {
      push(mkMessage(state, 'renewal_exhausted', subject.clientId, subject.id, renewalText(state, subject, true),
        `ren:${subject.id}:${pk.purchasedAt}:ex`))
    } else if (pk.remaining >= 1 && pk.remaining <= 2) {
      push(mkMessage(state, 'renewal', subject.clientId, subject.id, renewalText(state, subject, false),
        `ren:${subject.id}:${pk.purchasedAt}:low`))
    }
  }
  return add
}

export const ORDER: MessageKind[] = ['reminder', 'invoice', 'renewal_exhausted', 'renewal', 'faq_reply', 'receipt']
export const sortDrafts = (a: Message, b: Message): number => ORDER.indexOf(a.kind) - ORDER.indexOf(b.kind)

/** ส่งข้อความแล้วผลข้างเคียงต่อ invoice */
export function applySend(state: AppState, msg: Message): AppState {
  if (msg.kind === 'invoice' && msg.meta?.invoiceId) {
    const invId = String(msg.meta.invoiceId)
    return {
      ...state,
      invoices: state.invoices.map((i) =>
        i.id === invId && i.status === 'draft'
          ? { ...i, status: 'sent' as const, sentAt: state.today, dueAt: addDays(state.today, dueDaysOf(state)) }
          : i),
    }
  }
  return state
}

export const currentEstimate = (state: AppState, subject: Subject, period: string): number => {
  const b = subject.billing
  if (b.mode === 'flat_monthly') return b.amount
  if (b.mode === 'per_unit') return completionsIn(state, subject.id, period).length * b.rate
  return 0
}

export const monthlyInvoiceOf = invoiceFor
