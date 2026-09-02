import type { AppState, Invoice, InvoiceLine, Subject } from './types'
import { completionsIn, subjectById } from './ledger'
import { addDays, diffDays, periodThai } from './format'
import { professionById } from '../professions'

export const invoiceFor = (s: AppState, subjectId: string, period: string): Invoice | undefined =>
  s.invoices.find((i) => i.subjectId === subjectId && i.period === period && i.kind === 'monthly')

export const dueDaysOf = (s: AppState): number => professionById(s.professionId).dueDays ?? 3

/** สร้างบิลรายเดือน — package คืน null (เก็บเงินตอนซื้อแพ็ก ไม่ใช่รายเดือน) */
export function buildInvoice(subject: Subject, period: string, state: AppState): Invoice | null {
  const b = subject.billing
  const qty = completionsIn(state, subject.id, period).length
  const label = subject.label ?? subject.name
  let lines: InvoiceLine[]

  if (b.mode === 'per_unit') {
    if (qty === 0) return null
    lines = [{
      description: `${label} ${periodThai(period)} — ${qty} × ${b.rate}`,
      qty, unitPrice: b.rate, amount: qty * b.rate,
    }]
  } else if (b.mode === 'flat_monthly') {
    lines = [{ description: `${label} ${periodThai(period)} (เหมา)`, qty, unitPrice: b.amount, amount: b.amount }]
  } else {
    return null
  }

  const total = lines.reduce((n, l) => n + l.amount, 0)
  return {
    id: `inv-${subject.id}-${period}`,
    clientId: subject.clientId, subjectId: subject.id, period, kind: 'monthly',
    lines, total, status: 'draft', createdAt: state.today,
  }
}

/** บิลของการซื้อแพ็ก — สร้างตอนซื้อ/ต่อเท่านั้น */
export function buildPackageInvoice(subject: Subject, state: AppState, id: string): Invoice | null {
  const b = subject.billing
  if (b.mode !== 'package') return null
  const label = subject.label ?? subject.name
  const lines: InvoiceLine[] = [{
    description: `${label} — แพ็ก ${b.total} ครั้ง`, qty: b.total, unitPrice: Math.round(b.price / b.total), amount: b.price,
  }]
  return {
    id, clientId: subject.clientId, subjectId: subject.id, period: state.today.slice(0, 7),
    kind: 'package', lines, total: b.price, status: 'paid', createdAt: state.today, sentAt: state.today,
  }
}

/** sent แล้วเลย dueAt → overdue */
export function markOverdue(state: AppState): AppState {
  let changed = false
  const invoices = state.invoices.map((i) => {
    if (i.status === 'sent' && i.dueAt && state.today > i.dueAt) { changed = true; return { ...i, status: 'overdue' as const } }
    return i
  })
  return changed ? { ...state, invoices } : state
}

export function daysOverdue(state: AppState, inv: Invoice): number {
  if (!inv.dueAt) return 0
  if (inv.status !== 'sent' && inv.status !== 'overdue') return 0
  return Math.max(diffDays(state.today, inv.dueAt), 0)
}

/** ระดับการทวงสูงสุดที่เข้าเงื่อนไข */
export function ladderFor(state: AppState, inv: Invoice): 'soft' | 'clear' | 'final' | null {
  const ladder = professionById(state.professionId).reminderLadder ?? []
  const d = daysOverdue(state, inv)
  let picked: 'soft' | 'clear' | 'final' | null = null
  for (const step of [...ladder].sort((a, b) => a.minDaysOverdue - b.minDaysOverdue)) {
    if (d >= step.minDaysOverdue) picked = step.key
  }
  return picked
}

/** subject ที่ยังไม่มีบิลเดือนนี้และมีของให้เก็บ */
export function closableSubjects(state: AppState, period: string): { subject: Subject; invoice: Invoice }[] {
  const out: { subject: Subject; invoice: Invoice }[] = []
  for (const subject of state.subjects) {
    if (!subject.active) continue
    if (invoiceFor(state, subject.id, period)) continue
    const inv = buildInvoice(subject, period, state)
    if (inv) out.push({ subject, invoice: inv })
  }
  return out
}

export function sendInvoice(state: AppState, invoiceId: string): AppState {
  return {
    ...state,
    invoices: state.invoices.map((i) =>
      i.id === invoiceId && i.status === 'draft'
        ? { ...i, status: 'sent', sentAt: state.today, dueAt: addDays(state.today, dueDaysOf(state)) }
        : i),
  }
}

export const subjectOfInvoice = (s: AppState, inv: Invoice): Subject | undefined => subjectById(s, inv.subjectId)
