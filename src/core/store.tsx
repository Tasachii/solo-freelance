import {
  createContext, useCallback, useContext, useEffect, useMemo, useState, useRef, type ReactNode,
} from 'react'
import type { AppState, Message, Subject, Particle } from './types'
import { isParticle } from './particle'
import { buildReal, buildScenario, isScenario } from './scenarios'
import { appendEvent } from './events'
import { todayISO } from './format'
import { isWellFormed } from './backup'
import { urlParam } from './urlParams'
import { billingChangeIssue, closableSubjects, markOverdue } from './billing'
import { deriveDrafts, refreshDrafts, retractDrafts, applySend } from './messages'
import { balanceDue, complete as ledgerComplete, packageUnitPrice, renewPackage, snapshotLegacyPrices, uncomplete } from './ledger'
import { issueReceipt } from './receipts'
import { isBillingMode, isISODate, isMoney, isNonNegativeMoney, isTime } from './validation'
import { professionById } from '../professions'
import { messageSendIssue } from './messageDelivery'

const KEY = 'solo-demo-v3'
const SCHEMA = 4

export type Action =
  | { type: 'complete'; unitId: string }
  | { type: 'uncomplete'; unitId: string }
  | { type: 'closeMonth'; period: string }
  | { type: 'sendMessage'; id: string }
  | { type: 'skipMessage'; id: string }
  | { type: 'editMessage'; id: string; draft: string }
  | { type: 'refreshMessage'; id: string }
  | { type: 'addMessage'; message: Message }
  | { type: 'recordPayment'; invoiceId: string; amount: number; slipVerified: boolean; slipAmount?: number }
  | { type: 'renewPackage'; subjectId: string }
  | { type: 'upsertSubject'; subject: Subject; clientName: string; lineId?: string }
  | { type: 'deactivateSubject'; subjectId: string }
  | { type: 'deleteSubject'; subjectId: string }
  | { type: 'addUnit'; subjectId: string; time: string; label?: string }
  | { type: 'chat'; clientId: string; from: 'client' | 'provider'; text: string; viaAdmin?: boolean }
  | { type: 'waitlist'; entry: AppState['waitlist'][number] }
  | { type: 'setToday'; date: string }
  | { type: 'setProvider'; name: string; promptpayId: string; particle?: Particle }
  | { type: 'bulkAddSubjects'; rows: { name: string; clientName: string; lineId?: string }[]; billing: Subject['billing'] }
  | { type: 'onboarded' }
  | { type: 'startReal' }
  | { type: 'backedUp' }
  | { type: 'sendingStart'; awaiting: string; queue: string[] }
  | { type: 'sendingNext'; awaiting: string }
  | { type: 'sendingStop' }
  | { type: 'restore'; state: AppState }
  | { type: 'rescheduleUnit'; unitId: string; date: string; time: string }
  | { type: 'cancelUnit'; unitId: string }
  | { type: 'restoreUnit'; unitId: string }
  | { type: 'clearMessages' }
  | { type: 'replace'; state: AppState }
  | { type: 'track'; name: string; props?: Record<string, unknown> }

let uid = 0
const nid = (p: string): string => { uid += 1; return `${p}-${Date.now().toString(36)}${uid}` }

/** ทุก action วิ่งผ่านที่นี่ แล้ว normalize (markOverdue + deriveDrafts) ตอนท้ายเสมอ */
export function reducer(state: AppState, action: Action): AppState {
  let s = state
  switch (action.type) {
    case 'complete': s = ledgerComplete(s, action.unitId); break
    case 'uncomplete': s = uncomplete(s, action.unitId); break
    case 'closeMonth': {
      if (!/^\d{4}-(?:0[1-9]|1[0-2])$/.test(action.period)) return state
      const created = closableSubjects(s, action.period).map((c) => c.invoice)
      if (created.length) s = { ...s, invoices: [...s.invoices, ...created] }
      break
    }
    case 'sendMessage': {
      const msg = s.messages.find((m) => m.id === action.id)
      if (!msg) break
      if (messageSendIssue(s, msg)) return state
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
    case 'refreshMessage':
      s = { ...s, messages: s.messages.map(m => m.id === action.id ? { ...m, edited: false } : m) }
      break
    case 'addMessage':
      if (s.messages.some((m) => m.dedupeKey === action.message.dedupeKey)) break
      s = { ...s, messages: [...s.messages, action.message] }
      break
    case 'recordPayment': {
      const inv = s.invoices.find((i) => i.id === action.invoiceId)
      if (!inv || inv.status === 'paid') break // กดยืนยันซ้ำต้องไม่ออกใบเสร็จสองใบ
      if (!isMoney(action.amount) || action.amount > balanceDue(s, inv.id)) return state
      if (typeof action.slipVerified !== 'boolean') return state
      if (action.slipAmount !== undefined && !isNonNegativeMoney(action.slipAmount)) return state
      const pay = {
        id: nid('pay'), invoiceId: inv.id, amount: action.amount, paidAt: s.today,
        slipVerified: action.slipVerified,
        ...(action.slipAmount !== undefined ? { slipAmount: action.slipAmount } : {}),
      }
      const settled = action.amount === balanceDue(s, inv.id)
      s = {
        ...s,
        payments: [...s.payments, pay],
        invoices: s.invoices.map((i) => (i.id === inv.id && settled ? { ...i, status: 'paid' } : i)),
      }
      // ใบเสร็จต้องบอกยอดของบิล ไม่ใช่ยอดงวดสุดท้ายที่บังเอิญปิดยอดพอดี
      if (settled) s = issueReceipt(s, pay).state
      break
    }
    case 'renewPackage': {
      const subject = s.subjects.find((x) => x.id === action.subjectId)
      if (!subject?.active || subject.billing.mode !== 'package') return state
      const invId = nid('inv-pkg')
      const inv = {
        id: invId, clientId: subject.clientId, subjectId: subject.id, period: s.today.slice(0, 7),
        kind: 'package' as const,
        lines: [{ description: `${subject.label ?? subject.name} — แพ็ก ${subject.billing.total} ${professionById(s.professionId).vocab.units}`, qty: subject.billing.total, unitPrice: packageUnitPrice(subject.billing), amount: subject.billing.price }],
        total: subject.billing.price, status: 'paid' as const, createdAt: s.today, sentAt: s.today,
      }
      const pay = { id: nid('pay'), invoiceId: invId, amount: subject.billing.price, paidAt: s.today, slipVerified: true }
      s = { ...s, invoices: [...s.invoices, inv], payments: [...s.payments, pay] }
      s = issueReceipt(s, pay).state
      s = renewPackage(s, action.subjectId)
      break
    }
    case 'upsertSubject': {
      if (!action.subject.id || !action.subject.clientId || !action.subject.name.trim()
        || !action.clientName.trim() || !isISODate(action.subject.createdAt)
        || typeof action.subject.active !== 'boolean' || !isBillingMode(action.subject.billing)) return state
      const current = s.subjects.find((x) => x.id === action.subject.id)
      const exists = !!current
      if (current && billingChangeIssue(s, current, action.subject.billing)) return state
      if (current) s = snapshotLegacyPrices(s, current.id)
      const billing = current?.billing.mode === 'package' && action.subject.billing.mode === 'package'
        ? {
            ...action.subject.billing,
            purchasedAt: current.billing.purchasedAt,
            ...(current.billing.carriedUnitIds ? { carriedUnitIds: current.billing.carriedUnitIds } : {}),
          }
        : action.subject.billing
      const subject = { ...action.subject, billing }
      const clientExists = s.clients.some((c) => c.id === action.subject.clientId)
      s = {
        ...s,
        clients: clientExists
          ? s.clients.map((c) => (c.id === action.subject.clientId ? { ...c, name: action.clientName, lineId: action.lineId ?? c.lineId } : c))
          : [...s.clients, { id: action.subject.clientId, name: action.clientName, lineId: action.lineId }],
        subjects: exists ? s.subjects.map((x) => (x.id === subject.id ? subject : x)) : [...s.subjects, subject],
      }
      break
    }
    case 'deactivateSubject':
      s = { ...s, subjects: s.subjects.map((x) => (x.id === action.subjectId ? { ...x, active: false } : x)) }
      break
    case 'addUnit':
      if (!s.subjects.some((subject) => subject.id === action.subjectId) || !isTime(action.time)) return state
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
      if (!action.entry.professionId || !action.entry.name.trim() || !action.entry.contact.trim() || !isISODate(action.entry.at)) return state
      s = { ...s, waitlist: [...s.waitlist, action.entry] }
      break
    case 'setToday':
      if (!isISODate(action.date)) return state
      s = { ...s, today: action.date }
      break
    case 'setProvider':
      if (!action.name.trim() || typeof action.promptpayId !== 'string') return state
      if (action.particle !== undefined && !isParticle(action.particle)) return state
      s = { ...s, provider: { name: action.name, promptpayId: action.promptpayId, particle: action.particle ?? s.provider.particle } }
      break
    case 'bulkAddSubjects': {
      if (!isBillingMode(action.billing) || action.rows.length === 0
        || action.rows.some((row) => !row.name.trim() || !row.clientName.trim())) return state
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
    case 'deleteSubject': {
      const sub = s.subjects.find((x) => x.id === action.subjectId)
      if (!sub) break
      if (s.mode === 'real' && s.invoices.some((invoice) => invoice.subjectId === sub.id)) {
        s = { ...s, subjects: s.subjects.map((subject) => subject.id === sub.id ? { ...subject, active: false } : subject) }
        break
      }
      const unitIds = new Set(s.units.filter((u) => u.subjectId === sub.id).map((u) => u.id))
      const invIds = new Set(s.invoices.filter((i) => i.subjectId === sub.id).map((i) => i.id))
      const payIds = new Set(s.payments.filter((p) => invIds.has(p.invoiceId)).map((p) => p.id))
      // ลบทุกอย่างที่ห้อยอยู่กับคนนี้ ไม่ให้เหลือแถวกำพร้าที่ทำหน้าจอพัง
      s = {
        ...s,
        subjects: s.subjects.filter((x) => x.id !== sub.id),
        units: s.units.filter((u) => u.subjectId !== sub.id),
        completions: s.completions.filter((c) => !unitIds.has(c.unitId)),
        invoices: s.invoices.filter((i) => i.subjectId !== sub.id),
        payments: s.payments.filter((p) => !invIds.has(p.invoiceId)),
        receipts: s.receipts.filter((r) => !payIds.has(r.paymentId)),
        messages: s.messages.filter((m) => m.subjectId !== sub.id),
      }
      // ผู้จ่ายที่ไม่เหลือคนเรียนแล้ว ลบทิ้งพร้อมแชท
      const stillUsed = s.subjects.some((x) => x.clientId === sub.clientId)
      if (!stillUsed) {
        s = {
          ...s,
          clients: s.clients.filter((c) => c.id !== sub.clientId),
          chats: s.chats.filter((c) => c.clientId !== sub.clientId),
          messages: s.messages.filter((m) => m.clientId !== sub.clientId),
        }
      }
      break
    }
    case 'sendingStart':
      s = { ...s, sending: { awaiting: action.awaiting, queue: action.queue } }
      break
    case 'sendingNext':
      s = { ...s, sending: { awaiting: action.awaiting, queue: (s.sending?.queue ?? []).slice(1) } }
      break
    case 'sendingStop':
      s = { ...s, sending: undefined }
      break
    case 'backedUp':
      s = { ...s, lastBackupAt: s.today }
      break
    case 'restore':
      if (!isWellFormed(action.state)) return state
      // ไฟล์เก็บวันที่สำรองไว้ ถ้าเอามาทั้งก้อน 'วันนี้' จะแช่แข็งอยู่วันนั้น
      // เช็คชื่อทุกคาบหลังจากนี้จะลงวันผิดโดยไม่มีอะไรฟ้อง
      s = action.state.mode === 'real' ? { ...action.state, today: todayISO() } : action.state
      break
    case 'rescheduleUnit': {
      const u = s.units.find((x) => x.id === action.unitId)
      if (!u) break
      if (!isISODate(action.date) || !isTime(action.time)) return state
      // เลื่อนคาบไม่แตะเงิน — บิลคิดจาก completions ไม่ใช่ units
      s = {
        ...s,
        units: s.units.map((x) => (x.id === action.unitId
          ? { ...x, scheduledAt: action.date, time: action.time, movedFrom: x.movedFrom ?? x.scheduledAt, cancelled: false }
          : x)),
      }
      break
    }
    case 'cancelUnit':
      // เก็บ completion ไว้ ไม่ลบ — ledger มองข้ามคาบที่ถูกงดอยู่แล้ว
      // ถ้าลบทิ้ง กดงดผิดครั้งเดียวแล้วเงินหายถาวร กู้ไม่ได้
      s = { ...s, units: s.units.map((x) => (x.id === action.unitId ? { ...x, cancelled: true } : x)) }
      break
    case 'restoreUnit':
      s = { ...s, units: s.units.map((x) => (x.id === action.unitId ? { ...x, cancelled: false } : x)) }
      break
    case 'startReal':
      // เก็บชื่อ/พร้อมเพย์ที่กรอกไว้ ทิ้งข้อมูลสมมติทั้งหมด
      s = buildReal(s.provider)
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
  // ถอนก่อน แล้วค่อยสะกิดตัวเลข — ไม่งั้นจะไป render ร่างที่กำลังจะถูกถอนอยู่ดี
  s = { ...s, messages: retractDrafts(s) }
  s = { ...s, messages: refreshDrafts(s) }
  const add = deriveDrafts(s)
  if (add.length) s = { ...s, messages: [...s.messages, ...add] }
  return s
}

/**
 * v3 → v4: เพิ่ม mode · ข้อมูลเดิมทั้งหมดเป็นเดโม ห้ามทิ้ง
 * คืน null เมื่อกู้ไม่ได้จริง ๆ เท่านั้น
 */
export function migrate(raw: unknown): AppState | null {
  const s = raw as (Omit<Partial<AppState>, 'schemaVersion'> & { schemaVersion?: number })
  if (!s || typeof s !== 'object') return null
  const v3 = s.schemaVersion === 3
  const candidate = v3 ? { ...(s as AppState), schemaVersion: 4 as const, mode: 'demo' as const } : (s as AppState)
  if (!v3 && s.schemaVersion !== SCHEMA) return null
  // ตรวจครบทุก collection — ขาดตัวเดียวแล้วปล่อยผ่าน คือจอขาวตอน normalize
  return isWellFormed(candidate) ? snapshotLegacyPrices(candidate) : null
}

function hydrate(scenarioFromUrl: string | null): { state: AppState; didReset: boolean; recoveryRaw: string | null } {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
    if (raw) {
      const saved = migrate(JSON.parse(raw))
      if (!saved) throw new Error('invalid saved state')
      // A demo query parameter must never overwrite an existing real workspace.
      const chosen = saved.mode === 'demo' && scenarioFromUrl && isScenario(scenarioFromUrl)
        ? buildScenario(scenarioFromUrl) : saved
      const dated = chosen.mode === 'real' ? { ...chosen, today: todayISO() } : chosen
      return { state: normalize(dated), didReset: false, recoveryRaw: null }
    }
    return { state: normalize(buildScenario(scenarioFromUrl && isScenario(scenarioFromUrl) ? scenarioFromUrl : 'default')), didReset: false, recoveryRaw: null }
  } catch {
    // Preserve even syntactically broken JSON. Recovery is explicit; never autosave demo over it.
    return { state: normalize(buildScenario('empty')), didReset: true, recoveryRaw: raw }
  }
}

function normalize(s: AppState): AppState {
  let withOverdue = markOverdue(s)
  withOverdue = { ...withOverdue, messages: retractDrafts(withOverdue) }
  withOverdue = { ...withOverdue, messages: refreshDrafts(withOverdue) }
  const add = deriveDrafts(withOverdue)
  return add.length ? { ...withOverdue, messages: [...withOverdue.messages, ...add] } : withOverdue
}

interface StoreValue {
  state: AppState
  /** Synchronous durable transition. False means no state change was committed. */
  dispatch: (action: Action) => boolean
  track: (name: string, props?: Record<string, unknown>) => void
  resetDemo: (scenarioId?: string) => boolean
  didReset: boolean
  hydrated: boolean
  persistenceError: string | null
  recoveryRaw: string | null
}
const Ctx = createContext<StoreValue | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const initial = useMemo(() => hydrate(urlParam('scenario')), [])
  const [state, setState] = useState(initial.state)
  const current = useRef(state)
  const blocked = useRef(initial.didReset)
  const [didReset, setDidReset] = useState(initial.didReset)
  const [persistenceError, setPersistenceError] = useState<string | null>(initial.didReset ? 'เปิดข้อมูลเดิมไม่ได้ กรุณาเก็บสำเนาดิบแล้วกู้คืนจากไฟล์สำรอง' : null)
  const [recoveryRaw, setRecoveryRaw] = useState(initial.recoveryRaw)

  const dispatch = useCallback((action: Action): boolean => {
    if (blocked.current && action.type !== 'restore') return false
    const next = reducer(current.current, action)
    if (next === current.current) return false
    try {
      if (action.type === 'restore' || action.type === 'replace' || action.type === 'startReal') {
        const previous = localStorage.getItem(KEY)
        if (previous !== null) localStorage.setItem(`${KEY}-before-restore`, previous)
      }
      // localStorage is synchronous. On quota/security error keep the last committed state.
      localStorage.setItem(KEY, JSON.stringify(next))
      current.current = next
      blocked.current = false
      setState(next)
      setDidReset(false)
      setRecoveryRaw(null)
      setPersistenceError(null)
      return true
    } catch {
      setPersistenceError('บันทึกไม่สำเร็จ การเปลี่ยนแปลงล่าสุดยังไม่ถูกเก็บ กรุณาสำรองข้อมูล ตรวจพื้นที่ว่าง แล้วลองอีกครั้ง')
      return false
    }
  }, [])

  useEffect(() => {
    if (!blocked.current) dispatch({ type: 'track', name: 'storage_ready' })
  }, [dispatch])

  useEffect(() => {
    const tick = () => {
      if (current.current.mode !== 'real') return
      const now = todayISO()
      if (now !== current.current.today) dispatch({ type: 'setToday', date: now })
    }
    document.addEventListener('visibilitychange', tick)
    window.addEventListener('focus', tick)
    return () => {
      document.removeEventListener('visibilitychange', tick)
      window.removeEventListener('focus', tick)
    }
  }, [dispatch])

  const track = useCallback((name: string, props?: Record<string, unknown>) => {
    dispatch({ type: 'track', name, props })
  }, [dispatch])
  const resetDemo = useCallback((scenarioId?: string) =>
    dispatch({ type: 'replace', state: normalize(buildScenario(scenarioId ?? current.current.scenarioId)) }), [dispatch])
  const value = useMemo<StoreValue>(() => ({ state, dispatch, track, resetDemo, didReset,
    hydrated: true, persistenceError, recoveryRaw }),
  [state, dispatch, track, resetDemo, didReset, persistenceError, recoveryRaw])
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): StoreValue {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore must be used inside StoreProvider')
  return v
}

export { KEY as STORAGE_KEY, SCHEMA }
