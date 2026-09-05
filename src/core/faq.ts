import type { AppState, Subject } from './types'
import { modeLabelFor, professionById, templatesFor } from '../professions'
import type { FaqSource } from '../professions/types'
import { balanceDue, completionsIn, isCompleted, packageStatus, paidAmount } from './ledger'
import { invoiceFor } from './billing'
import { render, invoiceUrlOf, receiptUrlOf, currentEstimate } from './messages'
import { dateThai, dayThai, money, periodOf, periodThai } from './format'

/** ตัดช่องว่างซ้ำและ lowercase ก่อนจับ keyword */
export const normalize = (text: string): string => text.toLowerCase().replace(/\s+/g, '')

export function matchSource(professionId: string, text: string): FaqSource | null {
  const rules = professionById(professionId).faq ?? []
  const n = normalize(text)
  const hits = rules
    .filter((r) => r.keywords.some((k) => n.includes(normalize(k))))
    .sort((a, b) => a.priority - b.priority)
  return hits[0]?.answerFrom ?? null
}

function answerForSubject(state: AppState, subject: Subject, source: FaqSource): string | null {
  const templates = templatesFor(state.professionId)
  const period = periodOf(state.today)
  const b = subject.billing
  const common = { subjectName: subject.name, invoiceUrl: invoiceUrlOf(subject.clientId, state) }

  if (source === 'currentInvoice') {
    if (b.mode === 'package') return answerForSubject(state, subject, 'packageRemaining')
    const inv = invoiceFor(state, subject.id, period)
    if (inv) {
      return render(templates.faq.currentInvoice, {
        ...common, invoiceUrl: invoiceUrlOf(subject.clientId, state, inv.id), periodThai: periodThai(period),
        qty: inv.lines.reduce((n, l) => n + l.qty, 0), total: money(balanceDue(state, inv.id)),
      })
    }
    const done = completionsIn(state, subject.id, period).length
    return render(templates.faq.currentInvoiceNone, {
      ...common, completedSoFar: done || 0, estimate: money(currentEstimate(state, subject, period)),
    })
  }

  if (source === 'nextUnit') {
    const next = state.units
      .filter((u) => u.subjectId === subject.id)
      .filter((u) => !u.cancelled)
      // คาบที่เช็คชื่อแล้วคือเรียนจบไปแล้ว ห้ามตอบว่าเป็นคาบถัดไป
      .filter((u) => !isCompleted(state, u.id))
      .filter((u) => u.scheduledAt >= state.today)
      .sort((a, b) => (a.scheduledAt + a.time).localeCompare(b.scheduledAt + b.time))[0]
    if (!next) return render(templates.faq.nextUnitNone, {})
    return render(templates.faq.nextUnit, {
      ...common, dayThai: dayThai(next.scheduledAt), dateThai: dateThai(next.scheduledAt), time: next.time,
    })
  }

  if (source === 'packageRemaining') {
    const pk = packageStatus(state, subject)
    if (!pk) return render(templates.faq.packageNotPackage, { ...common, modeThai: modeLabelFor(state.professionId, b.mode) })
    return render(templates.faq.packageRemaining, {
      ...common, packageTotal: pk.total, used: pk.used, remaining: pk.remaining,
    })
  }
  return null
}

export interface FaqAnswer { source: FaqSource | null; text: string }

export function answer(state: AppState, clientId: string, question: string): FaqAnswer {
  const templates = templatesFor(state.professionId)
  const source = matchSource(state.professionId, question)
  if (!source) return { source: null, text: render(templates.faq.fallback, {}) }

  const subjects = state.subjects.filter((s) => s.clientId === clientId && s.active)
  if (subjects.length === 0) return { source: null, text: render(templates.faq.fallback, {}) }

  // สถานะการจ่ายเป็นเรื่องระดับผู้จ่าย ไม่ใช่รายคน จึงตอบครั้งเดียว
  if (source === 'paymentStatus') {
    const invs = state.invoices
      .filter((i) => i.clientId === clientId)
      .sort((a, b) => (b.sentAt ?? b.createdAt).localeCompare(a.sentAt ?? a.createdAt))
    // ค้างใบไหนก็ยังถือว่าค้าง — ตอบจากใบล่าสุดใบเดียวจะขัดกับข้อความทวงที่เพิ่งส่งไป
    const outstanding = invs.some((i) => i.status === 'sent' || i.status === 'overdue')
    const latest = invs[0]
    if (!outstanding && latest && latest.status === 'paid') {
      const rc = state.receipts.find((receipt) => state.payments.some((payment) =>
        payment.id === receipt.paymentId && payment.invoiceId === latest.id))
      return {
        source,
        text: render(templates.faq.paymentPaid, {
          total: money(paidAmount(state, latest.id)),
          receiptUrl: rc ? receiptUrlOf(rc.id, state) : invoiceUrlOf(clientId, state),
        }),
      }
    }
    const due = invs.filter((invoice) => invoice.status === 'sent' || invoice.status === 'overdue')
      .reduce((sum, invoice) => sum + balanceDue(state, invoice.id), 0)
    if (state.mode === 'real') {
      const open = invs.filter(i => i.status === 'sent' || i.status === 'overdue')
      if (open.length) return { source, text: open.map(inv =>
        render(templates.faq.paymentUnpaid, { total: money(balanceDue(state, inv.id)), invoiceUrl: invoiceUrlOf(clientId, state, inv.id) })).join('\n\n') }
    }
    return { source, text: render(templates.faq.paymentUnpaid, { invoiceUrl: invoiceUrlOf(clientId, state), total: money(due) }) }
  }

  const parts = subjects.map((s) => answerForSubject(state, s, source)).filter(Boolean) as string[]
  return { source, text: [...new Set(parts)].join('\n') }
}

export const subjectsOfClient = (state: AppState, clientId: string): Subject[] =>
  state.subjects.filter((s) => s.clientId === clientId)
