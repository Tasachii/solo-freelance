import type { AppState, Subject } from './types'
import { modeThai, tutorTemplates } from '../copy/tutor'
import { professionById } from '../professions'
import type { FaqSource } from '../professions/types'
import { completionsIn, packageStatus } from './ledger'
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
  const period = periodOf(state.today)
  const b = subject.billing
  const common = { subjectName: subject.name, invoiceUrl: invoiceUrlOf(subject.clientId) }

  if (source === 'currentInvoice') {
    if (b.mode === 'package') return answerForSubject(state, subject, 'packageRemaining')
    const inv = invoiceFor(state, subject.id, period)
    if (inv) {
      return render(tutorTemplates.faq.currentInvoice, {
        ...common, periodThai: periodThai(period),
        qty: inv.lines.reduce((n, l) => n + l.qty, 0), total: money(inv.total),
      })
    }
    const done = completionsIn(state, subject.id, period).length
    return render(tutorTemplates.faq.currentInvoiceNone, {
      ...common, completedSoFar: done || 0, estimate: money(currentEstimate(state, subject, period)),
    })
  }

  if (source === 'nextUnit') {
    const next = state.units
      .filter((u) => u.subjectId === subject.id)
      .filter((u) => u.scheduledAt > state.today || (u.scheduledAt === state.today && u.time > '12:00'))
      .sort((a, b) => (a.scheduledAt + a.time).localeCompare(b.scheduledAt + b.time))[0]
    if (!next) return render(tutorTemplates.faq.nextUnitNone, {})
    return render(tutorTemplates.faq.nextUnit, {
      ...common, dayThai: dayThai(next.scheduledAt), dateThai: dateThai(next.scheduledAt), time: next.time,
    })
  }

  if (source === 'packageRemaining') {
    const pk = packageStatus(state, subject)
    if (!pk) return render(tutorTemplates.faq.packageNotPackage, { ...common, modeThai: modeThai(b.mode) })
    return render(tutorTemplates.faq.packageRemaining, {
      ...common, packageTotal: pk.total, used: pk.used, remaining: pk.remaining,
    })
  }
  return null
}

export interface FaqAnswer { source: FaqSource | null; text: string }

export function answer(state: AppState, clientId: string, question: string): FaqAnswer {
  const source = matchSource(state.professionId, question)
  if (!source) return { source: null, text: render(tutorTemplates.faq.fallback, {}) }

  const subjects = state.subjects.filter((s) => s.clientId === clientId && s.active)
  if (subjects.length === 0) return { source: null, text: render(tutorTemplates.faq.fallback, {}) }

  // สถานะการจ่ายเป็นเรื่องระดับผู้จ่าย ไม่ใช่รายคน จึงตอบครั้งเดียว
  if (source === 'paymentStatus') {
    const invs = state.invoices
      .filter((i) => i.clientId === clientId)
      .sort((a, b) => (b.sentAt ?? b.createdAt).localeCompare(a.sentAt ?? a.createdAt))
    const latest = invs[0]
    if (latest && latest.status === 'paid') {
      const pay = state.payments.find((p) => p.invoiceId === latest.id)
      const rc = pay ? state.receipts.find((r) => r.paymentId === pay.id) : undefined
      return {
        source,
        text: render(tutorTemplates.faq.paymentPaid, {
          total: money(pay?.amount ?? latest.total),
          receiptUrl: rc ? receiptUrlOf(rc.id) : invoiceUrlOf(clientId),
        }),
      }
    }
    return { source, text: render(tutorTemplates.faq.paymentUnpaid, { invoiceUrl: invoiceUrlOf(clientId) }) }
  }

  const parts = subjects.map((s) => answerForSubject(state, s, source)).filter(Boolean) as string[]
  return { source, text: [...new Set(parts)].join('\n') }
}

export const subjectsOfClient = (state: AppState, clientId: string): Subject[] =>
  state.subjects.filter((s) => s.clientId === clientId)

