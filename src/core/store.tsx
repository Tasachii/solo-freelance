import {
  createContext, useCallback, useContext, useEffect, useMemo, useReducer, useRef, useState, type ReactNode,
} from 'react'
import type { AppState, Message, Subject } from './types'
import { buildScenario, isScenario } from './scenarios'
import { appendEvent } from './events'
import { urlParam } from './urlParams'
import { closableSubjects, markOverdue } from './billing'
import { deriveDrafts, refreshDrafts, applySend } from './messages'
import { complete as ledgerComplete, packageUnitPrice, renewPackage, uncomplete } from './ledger'
import { issueReceipt } from './receipts'

const KEY = 'solo-demo-v3'
const SCHEMA = 3

export type Action =
  | { type: 'complete'; unitId: string }
  | { type: 'uncomplete'; unitId: string }
  | { type: 'closeMonth'; period: string }
  | { type: 'sendMessage'; id: string }
  | { type: 'skipMessage'; id: string }
  | { type: 'editMessage'; id: string; draft: string }
  | { type: 'addMessage'; message: Message }
  | { type: 'recordPayment'; invoiceId: string; amount: number; slipVerified: boolean; slipAmount?: number }
  | { type: 'renewPackage'; subjectId: string }
  | { type: 'upsertSubject'; subject: Subject; clientName: string; lineId?: string }
  | { type: 'deactivateSubject'; subjectId: string }
  | { type: 'addUnit'; subjectId: string; time: string; label?: string }
  | { type: 'chat'; clientId: string; from: 'client' | 'provider'; text: string; viaAdmin?: boolean }
  | { type: 'waitlist'; entry: AppState['waitlist'][number] }
  | { type: 'setToday'; date: string }
  | { type: 'setProvider'; name: string; promptpayId: string }
  | { type: 'bulkAddSubjects'; rows: { name: string; clientName: string; lineId?: string }[]; billing: Subject['billing'] }
  | { type: 'onboarded' }
  | { type: 'clearMessages' }
  | { type: 'replace'; state: AppState }
  | { type: 'track'; name: string; props?: Record<string, unknown> }

let uid = 0
const nid = (p: string): string => { uid += 1; return `${p}-${Date.now().toString(36)}${uid}` }

/** ทุก action วิ่งผ่านที่นี่ แล้ว normalize (markOverdue + deriveDrafts) ตอนท้ายเสมอ */
function reducer(state: AppState, action: Action): AppState {
  let s = state
  switch (action.type) {
    case 'complete': s = ledgerComplete(s, action.unitId); break
    case 'uncomplete': s = uncomplete(s, action.unitId); break
    case 'closeMonth': {
      const created = closableSubjects(s, action.period).map((c) => c.invoice)
      if (created.length) s = { ...s, invoices: [...s.invoices, ...created] }
      break
    }
    case 'sendMessage': {
      const msg = s.messages.find((m) => m.id === action.id)
      if (!msg) break
      s = applySend(s, msg)
      s = { ...s, messages: s.messages.map((m) => (m.id === action.id ? { ...m, status: 'sent', sentAt: s.today } : m)) }
      if (msg.subjectId) {
        s = { ...s, chats: [...s.chats, { id: nid('ch'), clientId: msg.clientId, from: 'provider', text: msg.draft, at: s.today, viaAdmin: true }] }
      }
      break
    }
    case 'skipMessage':
      s = { ...s, messages: s.messages.map((m) => (m.id === action.id ? { ...m, status: 'skipped' } : m)) }
      break
    case 'editMessage':
      s = { ...s, messages: s.messages.map((m) => (m.id === action.id ? { ...m, draft: action.draft, edited: true } : m)) }
      break
    case 'addMessage':
      if (s.messages.some((m) => m.dedupeKey === action.message.dedupeKey)) break
      s = { ...s, messages: [...s.messages, action.message] }
      break
    case 'recordPayment': {
      const inv = s.invoices.find((i) => i.id === action.invoiceId)
      if (!inv || inv.status === 'paid') break // กดยืนยันซ้ำต้องไม่ออกใบเสร็จสองใบ
      const pay = {
        id: nid('pay'), invoiceId: inv.id, amount: action.amount, paidAt: s.today,
        slipVerified: action.slipVerified,
        ...(action.slipAmount !== undefined ? { slipAmount: action.slipAmount } : {}),
      }
      const paidSoFar = s.payments
        .filter((x) => x.invoiceId === inv.id)
        .reduce((n, x) => n + x.amount, 0) + pay.amount
      const settled = paidSoFar >= inv.total // จ่ายไม่ครบ = ยังค้าง ยอด 'ค้าง' ต้องไม่หายไปทั้งก้อน
      s = {
        ...s,
        payments: [...s.payments, pay],
        invoices: s.invoices.map((i) => (i.id === inv.id && settled ? { ...i, status: 'paid' } : i)),
      }
      if (settled) s = issueReceipt(s, pay).state
      break
    }
    case 'renewPackage': {
      const subject = s.subjects.find((x) => x.id === action.subjectId)
      if (!subject || subject.billing.mode !== 'package') break
      const invId = nid('inv-pkg')
      const inv = {
        id: invId, clientId: subject.clientId, subjectId: subject.id, period: s.today.slice(0, 7),
        kind: 'package' as const,
        lines: [{ description: `${subject.label ?? subject.name} — แพ็ก ${subject.billing.total} ครั้ง`, qty: subject.billing.total, unitPrice: packageUnitPrice(subject.billing), amount: subject.billing.price }],
        total: subject.billing.price, status: 'paid' as const, createdAt: s.today, sentAt: s.today,
      }
      const pay = { id: nid('pay'), invoiceId: invId, amount: subject.billing.price, paidAt: s.today, slipVerified: true }
      s = { ...s, invoices: [...s.invoices, inv], payments: [...s.payments, pay] }
      s = issueReceipt(s, pay).state
      s = renewPackage(s, action.subjectId)
      break
    }
    case 'upsertSubject': {
      const exists = s.subjects.some((x) => x.id === action.subject.id)
      const clientExists = s.clients.some((c) => c.id === action.subject.clientId)
      s = {
        ...s,
        clients: clientExists
          ? s.clients.map((c) => (c.id === action.subject.clientId ? { ...c, name: action.clientName, lineId: action.lineId ?? c.lineId } : c))
          : [...s.clients, { id: action.subject.clientId, name: action.clientName, lineId: action.lineId }],
        subjects: exists ? s.subjects.map((x) => (x.id === action.subject.id ? action.subject : x)) : [...s.subjects, action.subject],
      }
      break
    }
    case 'deactivateSubject':
      s = { ...s, subjects: s.subjects.map((x) => (x.id === action.subjectId ? { ...x, active: false } : x)) }
      break
    case 'addUnit':
      s = {
        ...s,
        units: [...s.units, {
          id: nid('u'), subjectId: action.subjectId, scheduledAt: s.today,
          time: action.time, durationMin: 60, label: action.label, adHoc: true,
        }],
      }
      break
    case 'chat':
      s = { ...s, chats: [...s.chats, { id: nid('ch'), clientId: action.clientId, from: action.from, text: action.text, at: s.today, viaAdmin: action.viaAdmin }] }
      break
    case 'waitlist':
      s = { ...s, waitlist: [...s.waitlist, action.entry] }
      break
    case 'setToday':
      s = { ...s, today: action.date }
      break
    case 'setProvider':
      s = { ...s, provider: { name: action.name, promptpayId: action.promptpayId } }
      break
    case 'bulkAddSubjects': {
      const clients = [...s.clients]
      const subjects = [...s.subjects]
      action.rows.forEach((r, i) => {
        const cid = nid(`c${i}`)
        clients.push({ id: cid, name: r.clientName, lineId: r.lineId })
        subjects.push({ id: nid(`s${i}`), name: r.name, clientId: cid, billing: action.billing, active: true, createdAt: s.today })
      })
      s = { ...s, clients, subjects }
      break
    }
    case 'onboarded':
      s = { ...s, onboarded: true }
      break
    case 'clearMessages':
      // เก็บ skipped/sent ไว้ ไม่งั้น dedupe หาย ร่างที่ผู้ใช้ข้ามจะกลับมา
      // และ 'Solo ช่วยไว้' ที่นับจากข้อความทวงที่ส่งแล้วจะกลายเป็นศูนย์
      s = { ...s, messages: s.messages.filter((m) => m.status !== 'draft') }
      break
    case 'replace':
      s = action.state
      break
    case 'track':
      s = { ...s, events: appendEvent(s.events, action.name, action.props) }
      break
  }

  s = markOverdue(s)
  s = { ...s, messages: refreshDrafts(s) }
  const add = deriveDrafts(s)
  if (add.length) s = { ...s, messages: [...s.messages, ...add] }
  return s
}

function hydrate(scenarioFromUrl: string | null): { state: AppState; didReset: boolean } {
  if (scenarioFromUrl && isScenario(scenarioFromUrl)) {
    return { state: normalize(buildScenario(scenarioFromUrl)), didReset: false }
  }
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return { state: normalize(buildScenario('default')), didReset: false }
    const saved = JSON.parse(raw) as AppState
    if (saved?.schemaVersion !== SCHEMA || !Array.isArray(saved.subjects)) {
      return { state: normalize(buildScenario('default')), didReset: true }
    }
    return { state: normalize(saved), didReset: false }
  } catch {
    return { state: normalize(buildScenario('default')), didReset: true }
  }
}

function normalize(s: AppState): AppState {
  let withOverdue = markOverdue(s)
  withOverdue = { ...withOverdue, messages: refreshDrafts(withOverdue) }
  const add = deriveDrafts(withOverdue)
  return add.length ? { ...withOverdue, messages: [...withOverdue.messages, ...add] } : withOverdue
}

interface StoreValue {
  state: AppState
  dispatch: React.Dispatch<Action>
  track: (name: string, props?: Record<string, unknown>) => void
  resetDemo: (scenarioId?: string) => void
  didReset: boolean
  hydrated: boolean
}
const Ctx = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const urlScenario = useMemo(() => urlParam('scenario'), [])
  const initial = useMemo(() => hydrate(urlScenario), [urlScenario])
  const [state, dispatch] = useReducer(reducer, initial.state)
  const [hydrated, setHydrated] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => { const t = window.setTimeout(() => setHydrated(true), 300); return () => window.clearTimeout(t) }, [])

  useEffect(() => {
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      try { localStorage.setItem(KEY, JSON.stringify(state)) } catch { /* โหมดส่วนตัวเขียนไม่ได้ */ }
    }, 300)
    return () => window.clearTimeout(timer.current)
  }, [state])

  const track = useCallback((name: string, props?: Record<string, unknown>) => {
    dispatch({ type: 'track', name, props })
  }, [])

  const resetDemo = useCallback((scenarioId?: string) => {
    dispatch({ type: 'replace', state: normalize(buildScenario(scenarioId ?? state.scenarioId)) })
  }, [state.scenarioId])

  const value = useMemo<StoreValue>(
    () => ({ state, dispatch, track, resetDemo, didReset: initial.didReset, hydrated }),
    [state, track, resetDemo, initial.didReset, hydrated],
  )
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): StoreValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore must be used inside StoreProvider')
  return v
}

export { KEY as STORAGE_KEY, SCHEMA }
