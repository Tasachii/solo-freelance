import type { AppState, Invoice, Message, MessageKind, Subject } from './types'
import { tutorTemplates } from '../copy/tutor'
import { professionById } from '../professions'
import { clientById, completionsIn, packageStatus, subjectById } from './ledger'
import { daysOverdue, dueDaysOf, invoiceFor, ladderFor } from './billing'
import { addDays, dateThai, dayThai, money, periodThai } from './format'

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

/**
 * ลิงก์ในข้อความต้องเป็น URL เต็ม — ผู้รับกดจากแชท จึงไม่มี origin ให้อ้างอิง
 * BASE_URL ทำให้ path ที่ deploy อยู่ติดไปด้วย
 */
const appUrl = (hashPath: string): string => {
  const base = import.meta.env?.BASE_URL ?? '/'
  const origin = typeof location !== 'undefined' ? location.origin : ''
  return `${origin}${base}#${hashPath}`
}
export const invoiceUrlOf = (clientId: string): string => appUrl(`/client/${clientId}`)
export const receiptUrlOf = (receiptId: string): string => appUrl(`/receipt/${receiptId}`)

const stripHonorific = (name: string | undefined, honorific: string): string => {
  if (!name) return '—'
  const rest = name.startsWith(honorific) ? name.slice(honorific.length) : name
  return rest.trim() || name
}

function baseVars(state: AppState, subject: Subject): Vars {
  const prof = professionById(state.professionId)
  const client = clientById(state, subject.clientId)
  return {
    // ชื่อที่บันทึกไว้มักมีคำนำหน้าติดมาแล้ว ("คุณแม่แพรว") — ตัดออกก่อน
    // ไม่งั้น {clientHonorific}{clientName} จะกลายเป็น "คุณคุณแม่แพรว"
    clientHonorific: prof.vocab.clientHonorific,
    clientName: stripHonorific(client?.name, prof.vocab.clientHonorific),
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

/** แจ้งเลื่อนคาบ — เกิดจากการกระทำของครู ไม่ใช่ derive จึงสร้างตอนกดเลื่อน */
export function movedText(state: AppState, subject: Subject, from: { date: string }, to: { date: string; time: string }): string {
  return render(tutorTemplates.moved, {
    ...baseVars(state, subject),
    fromDayThai: dayThai(from.date), fromDateThai: dateThai(from.date),
    dayThai: dayThai(to.date), dateThai: dateThai(to.date), time: to.time,
  })
}

export function cancelledText(state: AppState, subject: Subject, at: string): string {
  return render(tutorTemplates.cancelled, {
    ...baseVars(state, subject), dayThai: dayThai(at), dateThai: dateThai(at),
  })
}

/** สรุปกลางเดือน — ตัวเลขมาจาก ledger ทั้งหมด */
export function summaryText(state: AppState, subject: Subject, period: string): string {
  const qty = completionsIn(state, subject.id, period).length
  const pk = packageStatus(state, subject)
  const amountLine = pk
    ? render(tutorTemplates.summaryPackage, { remaining: pk.remaining, packageTotal: pk.total })
    : render(tutorTemplates.summaryAmount, { total: money(currentEstimate(state, subject, period)) })
  return render(tutorTemplates.summary, {
    ...baseVars(state, subject), periodThai: periodThai(period), qty, amountLine,
  })
}

export function renewalText(state: AppState, subject: Subject, exhausted: boolean): string {
  const pk = packageStatus(state, subject)!
  const vars: Vars = {
    ...baseVars(state, subject),
    packageTotal: pk.total, packagePrice: money(pk.price),
    remaining: pk.remaining,
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

function rerender(state: AppState, m: Message): string | null {
  const invOf = (id: unknown) => state.invoices.find((i) => i.id === id)
  const subjOf = () => (m.subjectId ? subjectById(state, m.subjectId) : undefined)

  if (m.kind === 'reminder') {
    const inv = invOf(m.meta?.invoiceId)
    const ladder = m.meta?.ladder as 'soft' | 'clear' | 'final' | undefined
    return inv && ladder ? reminderText(state, inv, ladder) : null
  }
  if (m.kind === 'invoice') {
    const inv = invOf(m.meta?.invoiceId)
    return inv ? invoiceText(state, inv) : null
  }
  if (m.kind === 'receipt') {
    const r = state.receipts.find((x) => x.id === m.meta?.receiptId)
    const pay = r ? state.payments.find((p) => p.id === r.paymentId) : undefined
    const inv = pay ? invOf(pay.invoiceId) : undefined
    return r && pay && inv ? receiptText(state, inv, r.id, pay.amount) : null
  }
  if (m.kind === 'renewal' || m.kind === 'renewal_exhausted') {
    const subject = subjOf()
    if (!subject || !packageStatus(state, subject)) return null
    return renewalText(state, subject, m.kind === 'renewal_exhausted')
  }
  return null
}

/**
 * ร่างที่ยังไม่ส่งต้องสะกิดตัวเลขให้ตรง ledger เสมอ
 * ("ค้างมา 4 วัน" ที่ร่างไว้เมื่อวาน วันนี้ต้องเป็น 5) — ยกเว้นร่างที่ผู้ใช้แก้เอง
 * ครอบทุกชนิด เพราะร่างเก่าที่ค้างใน localStorage ต้องได้ข้อความรุ่นใหม่ด้วย
 */
export function refreshDrafts(state: AppState): Message[] {
  return state.messages.map((m) => {
    if (m.status !== 'draft' || m.edited) return m
    const fresh = rerender(state, m)
    return !fresh || fresh === m.draft ? m : { ...m, draft: fresh }
  })
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

export const ORDER: MessageKind[] = ['moved', 'cancelled', 'reminder', 'invoice', 'renewal_exhausted', 'renewal', 'faq_reply', 'summary', 'receipt']
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
