import type { AppState, BillingMode, Invoice, InvoiceLine, Subject } from './types'
import { completionsIn, completionsOfSubject, occurredAt, packageUnitPrice, subjectById } from './ledger'
import { addDays, diffDays, periodOf, periodThai } from './format'
import { professionById } from '../professions'

export const invoiceFor = (s: AppState, subjectId: string, period: string): Invoice | undefined =>
  s.invoices.find((i) => i.subjectId === subjectId && i.period === period && i.kind === 'monthly')

export const isFinalizedPeriod = (state: AppState, subjectId: string, period: string): boolean =>
  state.mode === 'real' && state.invoices.some(invoice => invoice.subjectId === subjectId
    && invoice.period === period && invoice.kind === 'monthly' && invoice.status !== 'draft')

export function mutationTouchesFinalizedPeriod(state: AppState, unitId: string, nextDate?: string): boolean {
  const unit = state.units.find(row => row.id === unitId)
  if (!unit) return false
  return isFinalizedPeriod(state, unit.subjectId, periodOf(unit.scheduledAt))
    || (nextDate !== undefined && isFinalizedPeriod(state, unit.subjectId, periodOf(nextDate)))
}

export const dueDaysOf = (s: AppState): number => professionById(s.professionId).dueDays ?? 3

export type BillingChangeIssue = 'unbilled-mode-change' | 'unbilled-flat-price-change' | 'package-history-mode-change'

export function hasUnbilledCompletions(state: AppState, subjectId: string): boolean {
  const periods = new Set(completionsOfSubject(state, subjectId).map((completion) => periodOf(occurredAt(state, completion))))
  return [...periods].some((period) => !state.invoices.some((invoice) =>
    invoice.subjectId === subjectId && invoice.kind === 'monthly' && invoice.period === period))
}

/** คืนเหตุผลเดียวกันให้ UI และ reducer ใช้ ห้ามให้ UI guard เป็น source of truth */
export function billingChangeIssue(state: AppState, current: Subject, next: BillingMode): BillingChangeIssue | null {
  if (current.billing.mode === 'package' && next.mode !== 'package'
    && (completionsOfSubject(state, current.id).length > 0
      || state.invoices.some(i => i.subjectId === current.id && i.kind === 'package'))) return 'package-history-mode-change'
  if (!hasUnbilledCompletions(state, current.id)) return null
  if (current.billing.mode !== next.mode) return 'unbilled-mode-change'
  if (current.billing.mode === 'flat_monthly' && next.mode === 'flat_monthly'
    && current.billing.amount !== next.amount) return 'unbilled-flat-price-change'
  return null
}

/** สร้างบิลรายเดือน — package คืน null (เก็บเงินตอนซื้อแพ็ก ไม่ใช่รายเดือน) */
export function buildInvoice(subject: Subject, period: string, state: AppState): Invoice | null {
  const profession = professionById(state.professionId)
  const b = subject.billing
  const completions = completionsIn(state, subject.id, period)
  const qty = completions.length
  const label = subject.label ?? subject.name
  let lines: InvoiceLine[]

  if (b.mode === 'per_unit') {
    if (qty === 0) return null
    const rates = new Map<number, number>()
    for (const completion of completions) {
      const rate = completion.unitPrice ?? b.rate
      rates.set(rate, (rates.get(rate) ?? 0) + 1)
    }
    lines = [...rates.entries()].sort(([a], [z]) => a - z).map(([rate, count]) => ({
      description: `${label} ${periodThai(period)} — ${count} ${profession.vocab.units} × ${rate}`,
      qty: count, unitPrice: rate, amount: count * rate,
    }))
  } else if (b.mode === 'flat_monthly') {
    // เหมาเดือน = 1 รายการ ไม่ใช่ qty × ยอดเหมา (ไม่งั้น qty × unitPrice ไม่เท่ากับ amount)
    lines = [{
      description: `${label} ${periodThai(period)} (เหมา · ${qty} ${profession.vocab.units})`,
      qty: 1, unitPrice: b.amount, amount: b.amount,
    }]
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
    description: `${label} — แพ็ก ${b.total} ${professionById(state.professionId).vocab.units}`, qty: b.total, unitPrice: packageUnitPrice(b), amount: b.price,
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
    if (!subject.active && completionsIn(state, subject.id, period).length === 0) continue
    if (invoiceFor(state, subject.id, period)) continue
    const inv = buildInvoice(subject, period, state)
    if (inv) out.push({ subject, invoice: inv })
  }
  return out
}

/** Periods with real work that still has no monthly invoice, including archived subjects. */
export function closablePeriods(state: AppState): string[] {
  const periods = new Set(state.completions.map(completion => {
    const unit = state.units.find(row => row.id === completion.unitId)
    return unit && !unit.cancelled ? periodOf(unit.scheduledAt) : null
  }).filter((period): period is string => !!period))
  return [...periods].filter(period => closableSubjects(state, period).length > 0).sort()
}

/** Rebuild drafts from ledger after every relevant mutation. Issued history is never touched. */
export function reconcileDraftInvoices(state: AppState): AppState {
  let changed = false
  const invoices = state.invoices.flatMap(invoice => {
    if (invoice.kind !== 'monthly' || invoice.status !== 'draft') return [invoice]
    const subject = state.subjects.find(row => row.id === invoice.subjectId)
    const fresh = subject && buildInvoice(subject, invoice.period, state)
    if (!fresh) { changed = true; return [] }
    if (JSON.stringify(fresh.lines) === JSON.stringify(invoice.lines) && fresh.total === invoice.total) return [invoice]
    changed = true
    return [{ ...invoice, lines: fresh.lines, total: fresh.total }]
  })
  return changed ? { ...state, invoices } : state
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
