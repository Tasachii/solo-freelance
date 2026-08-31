import { useCallback, useEffect, useRef, useState } from 'react'
import {
  DEFAULT_SETTINGS, SEED_STUDENTS, SEED_EXPENSES, SEED_SLIPS, SEED_INBOX,
  seedRecords, TODAY, TODAY_PERIOD, UNDO_LIMIT,
} from './data.js'
import { periodOf, shiftPeriod, weekday, shortDate, longMonth } from './dates.js'

export const STORAGE_KEY = 'tutordai-demo-v1'
const SCHEMA = 3

const clone = (v) => JSON.parse(JSON.stringify(v))
export const uid = (p) => `${p}-${Math.random().toString(36).slice(2, 9)}`

export function freshState() {
  const students = SEED_STUDENTS.map(({ status, ...rest }) => clone(rest))
  const records = seedRecords()
  // เดือนก่อนๆ ถือว่าเก็บเงินครบแล้ว เดือนปัจจุบันใช้สถานะจากบรีฟ
  const status = {}
  for (let i = 5; i >= 1; i--) {
    const p = shiftPeriod(TODAY_PERIOD, -i)
    status[p] = Object.fromEntries(SEED_STUDENTS.map((s) => [s.id, 'paid']))
  }
  status[TODAY_PERIOD] = Object.fromEntries(SEED_STUDENTS.map((s) => [s.id, s.status]))

  return {
    v: SCHEMA,
    settings: clone(DEFAULT_SETTINGS),
    students,
    records,
    status,
    sessionState: {},
    extraSessions: [],
    expenses: clone(SEED_EXPENSES),
    slips: clone(SEED_SLIPS),
    inbox: clone(SEED_INBOX),
    outbox: [],
    activity: [],
    reminded: {},
    history: [],
  }
}

export function emptyState(settings) {
  return {
    ...freshState(),
    settings: clone(settings || DEFAULT_SETTINGS),
    students: [], records: {}, status: {}, sessionState: {}, extraSessions: [],
    expenses: [], slips: {}, inbox: [], outbox: [], activity: [], reminded: {}, history: [],
  }
}

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return freshState()
    const saved = JSON.parse(raw)
    if (saved?.v !== SCHEMA) return freshState()
    return {
      ...freshState(), ...saved,
      settings: { ...clone(DEFAULT_SETTINGS), ...(saved.settings || {}) },
    }
  } catch {
    return freshState()
  }
}

/** เขียน localStorage แบบหน่วง กันการพิมพ์ในหน้าตั้งค่าทำให้เขียนทุกตัวอักษร */
function useDebouncedPersist(state) {
  const timer = useRef(null)
  useEffect(() => {
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)) } catch { /* โหมดส่วนตัว */ }
    }, 250)
    return () => clearTimeout(timer.current)
  }, [state])
}

export function useDemoState() {
  const [state, setState] = useState(load)
  useDebouncedPersist(state)

  /** ทุกการเปลี่ยนแปลงผ่านตรงนี้ เพื่อให้ย้อนได้หลายขั้นและมีประวัติ */
  const commit = useCallback((mutate, label) => {
    setState((prev) => {
      const next = mutate(prev)
      if (next === prev) return prev
      const snap = { ...prev }
      delete snap.history
      const entry = { id: uid('h'), label, at: new Date().toISOString(), snap }
      return { ...next, history: [entry, ...(prev.history || [])].slice(0, UNDO_LIMIT) }
    })
  }, [])

  /** ย้อนกลับ n+1 ขั้น (n=0 คือขั้นล่าสุด) */
  const undo = useCallback((n = 0) => {
    let label = null
    setState((prev) => {
      const hist = prev.history || []
      if (!hist[n]) return prev
      label = hist[n].label
      return { ...clone(hist[n].snap), history: hist.slice(n + 1) }
    })
    return label
  }, [])

  const reset = useCallback(() => setState(freshState()), [])
  const clear = useCallback(() => setState((s) => emptyState(s.settings)), [])
  const replace = useCallback((next) => setState(next), [])

  return { state, setState, commit, undo, reset, clear, replace }
}

// ═══ ตัวเลือกข้อมูล ═══════════════════════════════════════════════

export const rateOf = (student, state) =>
  student.rate ?? state.settings.rates[student.type] ?? 0

export const recordsOf = (state, id) => state.records[id] || []

export const recordsIn = (state, id, period) =>
  recordsOf(state, id).filter((r) => periodOf(r.date) === period && r.kind === 'attended')

/** ยอดคิดจากราคาที่ติดมากับแต่ละครั้ง ไม่ใช่ราคาปัจจุบัน — ขึ้นราคาแล้วบิลเก่าจึงไม่ขยับ */
export function billOf(student, state, period) {
  const list = recordsIn(state, student.id, period)
  const amount = list.reduce((n, r) => n + (r.rate ?? rateOf(student, state)), 0)
  const rates = [...new Set(list.map((r) => r.rate))]
  return {
    times: list.length,
    amount,
    uniformRate: rates.length === 1 ? rates[0] : null,
    mixedRates: rates.length > 1,
    status: statusOf(state, period, student),
  }
}

export function statusOf(state, period, student) {
  const explicit = state.status?.[period]?.[student.id]
  if (explicit) return explicit
  const list = recordsIn(state, student.id, period)
  return list.length === 0 ? 'none' : 'pending'
}

export function totals(state, period) {
  let total = 0, paid = 0
  for (const s of state.students) {
    const { amount, status } = billOf(s, state, period)
    total += amount
    if (status === 'paid') paid += amount
  }
  return { total, paid, outstanding: total - paid }
}

export const expensesIn = (state, period) =>
  state.expenses.filter((e) => periodOf(e.date) === period)

export const expenseTotal = (state, period) =>
  expensesIn(state, period).reduce((n, e) => n + (Number(e.amount) || 0), 0)

export function netMonth(state, period) {
  return totals(state, period).paid - expenseTotal(state, period)
}

/** รายรับจริงของ 6 เดือนล่าสุด คำนวณจากข้อมูลจริงทั้งหมด ไม่ใช่ตัวเลข mock */
export function incomeSeries(state, period, months = 6) {
  const out = []
  for (let i = months - 1; i >= 0; i--) {
    const p = shiftPeriod(period, -i)
    out.push({ period: p, amount: totals(state, p).total })
  }
  return out
}

/** คาบสอนของวันที่กำหนด สร้างจากตารางประจำสัปดาห์ + คาบเสริมที่เพิ่มเอง */
export function sessionsOn(state, date) {
  const day = weekday(date)
  const fromSchedule = state.students
    .filter((s) => s.life === 'active')
    .flatMap((s) =>
      (s.schedule || [])
        .filter((sl) => sl.day === day)
        .map((sl) => ({
          id: `${date}|${s.id}|${sl.time}`,
          date, time: sl.time, studentId: s.id,
          subject: s.subject, grade: s.grade, type: s.type,
        })),
    )
  const extra = (state.extraSessions || [])
    .filter((e) => e.date === date)
    .map((e) => {
      const s = state.students.find((x) => x.id === e.studentId)
      return s && { id: e.id, date, time: e.time, studentId: s.id, subject: s.subject, grade: s.grade, type: s.type, extra: true }
    })
    .filter(Boolean)
  return [...fromSchedule, ...extra].sort((a, b) => a.time.localeCompare(b.time))
}

/** นักเรียนที่ควรดูเป็นพิเศษ — ไม่นับคนที่เพิ่งเพิ่มเข้ามาและยังไม่เริ่มเรียน */
export function needsAttention(state, period) {
  const out = []
  for (const s of state.students) {
    if (s.life !== 'active') continue
    const { times, status, amount } = billOf(s, state, period)
    if (status === 'overdue') {
      out.push({ student: s, why: `ค้างจ่าย ${baht(amount)} บาท`, tone: 'bad' })
    } else if (times > 0 && s.plan - times >= 2) {
      out.push({ student: s, why: `เรียน ${times}/${s.plan} ครั้ง ต่ำกว่าแผน`, tone: 'warn' })
    }
  }
  return out
}

const nf = new Intl.NumberFormat('en-US')
export const baht = (n) => nf.format(Math.round(Number(n) || 0))

export function initialOf(nick) {
  const name = String(nick || '').replace(/^น้อง/, '')
  const stripped = name.replace(/^[เแโใไ]/, '')
  return (stripped || name).charAt(0) || '?'
}

export function logged(state, text) {
  return [{ id: uid('a'), at: shortDate(TODAY), text }, ...state.activity].slice(0, 60)
}

export function inboxed(state, entry) {
  return [{ id: uid('i'), at: shortDate(TODAY), read: false, ...entry }, ...state.inbox].slice(0, 60)
}

// ═══ นำข้อมูลออก / กู้คืน ═════════════════════════════════════════

export function buildCsv(state, period) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = [`เดือน,${longMonth(period)}`, '', 'ประเภท,ชื่อ,รายละเอียด,จำนวนครั้ง,ยอด,สถานะ']
  for (const s of state.students) {
    const { times, amount, status } = billOf(s, state, period)
    lines.push(['นักเรียน', s.nick, `${s.grade} ${s.subject} (${s.parent})`, times, amount, status].map(esc).join(','))
  }
  for (const e of expensesIn(state, period)) {
    lines.push(['รายจ่าย', e.category, `${shortDate(e.date)} ${e.note}`, '', -e.amount, ''].map(esc).join(','))
  }
  return '﻿' + lines.join('\n')
}

export function buildBackup(state) {
  const { history, ...rest } = state
  return JSON.stringify({ app: 'tutordai-demo', v: SCHEMA, exportedAt: new Date().toISOString(), state: rest }, null, 2)
}

/** อ่านไฟล์สำรองกลับเข้ามา — ตรวจให้แน่ใจก่อนว่าเป็นไฟล์ของแอปนี้จริง */
export function parseBackup(text) {
  let data
  try { data = JSON.parse(text) } catch { throw new Error('ไฟล์นี้ไม่ใช่ JSON ที่อ่านได้') }
  if (data?.app !== 'tutordai-demo') throw new Error('ไฟล์นี้ไม่ใช่ไฟล์สำรองของติวได้ตังค์')
  if (data?.v !== SCHEMA) throw new Error(`ไฟล์สำรองเป็นเวอร์ชัน ${data?.v ?? '?'} แต่แอปใช้เวอร์ชัน ${SCHEMA}`)
  if (!Array.isArray(data?.state?.students)) throw new Error('ไฟล์สำรองไม่มีข้อมูลนักเรียน')
  return { ...freshState(), ...data.state, history: [] }
}
